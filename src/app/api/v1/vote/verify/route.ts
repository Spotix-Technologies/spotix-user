/**
 * src/app/api/v1/vote/verify/route.ts
 *
 * POST /api/v1/vote/verify
 *
 * Legacy manual vote-crediting endpoint. Not currently called anywhere in
 * the app — the live callback flow (polls/[poll-name]/callback/page.tsx)
 * only calls GET /api/v1/polls/verify, which is read-only and relies on the
 * backend webhook (v1/voting.js) to have already credited the vote.
 *
 * Kept here for backward compatibility, brought in line with the rest of
 * the payment system: single "Reference" collection (was incorrectly
 * checking a duplicate lowercase "references" collection), and an
 * idempotency guard so calling this after the webhook has already run
 * cannot double-credit votes.
 *
 * Works with FLAT voting/{pollId} collection (new booker architecture).
 * Falls back to nested voting/{creatorId}/votes/{voteId} for legacy polls.
 * Does NOT support group polls (categoryId) — only single-poll contestants[].
 * If this route is ever wired back up for real traffic, it should be
 * replaced with a call into the same logic v1/voting.js uses server-side,
 * so group polls and the entries/votingHistory writes stay in sync.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference, status, transactionReference, paymentReference, message } = body

    if (!reference || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // ── Locate reference doc ──────────────────────────────────────────────────
    const refCollection = "Reference"
    const refSnap = await adminDb.collection(refCollection).doc(reference).get()

    if (!refSnap.exists) {
      return NextResponse.json({ error: "Payment reference not found" }, { status: 404 })
    }

    const refData = refSnap.data()!

    // ── Idempotency guard ────────────────────────────────────────────────────
    // If the webhook (v1/voting.js) already resolved this reference, don't
    // credit votes a second time.
    if (refData.status === "successful" || refData.status === "success" || refData.status === "failed") {
      return NextResponse.json(
        { success: true, message: `Payment already recorded as "${refData.status}"`, alreadyProcessed: true },
        { status: 200 },
      )
    }

    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    }

    if (status === "success") {
      updateData.transactionReference  = transactionReference
      updateData.paymentReference      = paymentReference
      updateData.paymentCompletedAt    = new Date().toISOString()

      // ── Credit votes ─────────────────────────────────────────────────────
      const {
        pollId,
        voteId,
        creatorId,
        contestantId,
        voteCount,
        totalAmount,
        pollPrice,
        contestantName,
        userId,
        guestEmail,
        isGuest,
      } = refData

      // Determine the flat pollId (booker stores pollId; legacy stored voteId + creatorId)
      const flatId = pollId ?? voteId ?? null

      if (flatId) {
        try {
          // ── Try flat voting/{pollId} first ──────────────────────────────
          const flatRef  = adminDb.collection("voting").doc(flatId)
          const flatSnap = await flatRef.get()

          if (flatSnap.exists && flatSnap.data()?.pollName) {
            // Flat document — use atomic array-safe update
            const flatData   = flatSnap.data()!
            const contestants: any[] = flatData.contestants ?? []

            const updatedContestants = contestants.map((c: any) =>
              c.contestantId === contestantId
                ? { ...c, votes: (c.votes ?? 0) + Number(voteCount) }
                : c
            )

            const voteEntry = {
              uid:            userId ?? guestEmail ?? null,
              voteCount:      Number(voteCount),
              price:          pollPrice ?? 0,
              contestantId,
              contestantName: contestantName ?? "",
              date:           new Date().toISOString(),
              reference,
              isGuest:        isGuest ?? false,
            }

            await flatRef.update({
              contestants:                    updatedContestants,
              pollCount:                      FieldValue.increment(Number(voteCount)),
              pollAmount:                     FieldValue.increment(Number(totalAmount ?? 0)),
              updatedAt:                      FieldValue.serverTimestamp(),
            })

            // Scalable per-vote records (mirrors v1/voting.js) instead of an
            // unbounded pollEntries array on the poll document.
            await flatRef.collection("entries").doc(reference).set(voteEntry)
            await adminDb.collection("votingHistory").doc(reference).set({
              ...voteEntry,
              pollId:   flatId,
              pollName: flatData.pollName ?? "",
              pollType: flatData.pollType ?? "single",
              creatorId: flatData.creatorId ?? flatData.organizerId ?? null,
            })

            console.log(`[vote/verify] Credited ${voteCount} votes to ${contestantId} in flat voting/${flatId}`)
          } else if (creatorId) {
            // ── Fallback: nested voting/{creatorId}/votes/{voteId} ─────────
            const nestedRef  = adminDb.collection("voting").doc(creatorId).collection("votes").doc(flatId)
            const nestedSnap = await nestedRef.get()

            if (nestedSnap.exists) {
              const nestedData   = nestedSnap.data()!
              const contestants: any[] = nestedData.contestants ?? []

              const updatedContestants = contestants.map((c: any) =>
                c.contestantId === contestantId
                  ? { ...c, votes: (c.votes ?? 0) + Number(voteCount) }
                  : c
              )

              const voteEntry = {
                uid:            userId ?? guestEmail ?? null,
                voteCount:      Number(voteCount),
                price:          pollPrice ?? 0,
                contestantId,
                contestantName: contestantName ?? "",
                date:           new Date().toISOString(),
                reference,
                isGuest:        isGuest ?? false,
              }

              await nestedRef.update({
                contestants:  updatedContestants,
                pollCount:    FieldValue.increment(Number(voteCount)),
                pollAmount:   FieldValue.increment(Number(totalAmount ?? 0)),
              })

              await nestedRef.collection("entries").doc(reference).set(voteEntry)
              await adminDb.collection("votingHistory").doc(reference).set({
                ...voteEntry,
                pollId:    flatId,
                pollName:  nestedData.pollName ?? "",
                pollType:  nestedData.pollType ?? "single",
                creatorId,
              })

              console.log(`[vote/verify] Credited ${voteCount} votes (nested path) for ${contestantId}`)
            }
          }
        } catch (err) {
          console.error("[vote/verify] Error crediting votes:", err)
          // Non-fatal — still record payment success below
        }
      }
    } else if (status === "failed") {
      updateData.failureMessage  = message ?? "Payment failed"
      updateData.paymentFailedAt = new Date().toISOString()
    }

    // ── Update reference doc ────────────────────────────────────────────────
    await adminDb.collection(refCollection).doc(reference).update(updateData)

    return NextResponse.json(
      { success: true, message: `Payment ${status} recorded successfully` },
      { status: 200 }
    )
  } catch (error) {
    console.error("[vote/verify] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
