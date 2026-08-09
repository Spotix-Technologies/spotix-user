/**
 * src/app/api/v1/vote/check-payment/route.ts
 *
 * GET /api/v1/vote/check-payment?q={emailOrPhoneOrReference}&pollId={pollId}
 * GET /api/v1/vote/check-payment?contestantId={contestantId}&pollId={pollId}
 *
 * Lets a voter self-serve check whether a vote payment reflected, without
 * needing to be logged in. Searches the `Reference` collection (the same
 * collection voting_purchase docs are written to — see
 * /api/v1/vote/payref and /api/v1/polls/verify) for docs scoped to this
 * poll where payerEmail, payerPhone, reference, or contestantId matches.
 *
 * Firestore doesn't support an OR across different fields in one query, so
 * this runs several equality queries in parallel and merges/dedupes the
 * results by reference. All filters are plain equality (==) so no
 * composite index is required.
 *
 * contestantId is gated behind the poll's `statsVisible` flag: it lets
 * anyone pull every reference (and its status) made toward one
 * contestant, which is effectively that contestant's raw vote log — the
 * same information statsVisible already controls elsewhere on the poll.
 * If the organizer has statsVisible off, contestantId search is rejected
 * with a clear explanation rather than silently returning nothing;
 * reference/email/phone search is unaffected either way.
 *
 * Returns up to MAX_RESULTS most recent matches, newest first. The client
 * paginates through them locally 5-at-a-time via "Load More" — simpler and
 * cheaper than cursor-based pagination across merged queries, and a voter
 * realistically never has more than a handful of votes on one poll under
 * the same email/phone/reference/contestant.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

const MAX_RESULTS = 50

interface PaymentMatch {
  reference:      string
  status:         string
  contestantId:   string | null
  contestantName: string
  voteCount:      number
  totalAmount:    number
  pollName:       string
  pollId:         string
  createdAt:      string | null
  payerEmail:     string | null
  payerPhone:     string | null
}

function toIso(v: unknown): string | null {
  if (!v) return null
  if (typeof v === "string") return v
  if (typeof v === "object" && "seconds" in (v as any)) return new Date((v as any).seconds * 1000).toISOString()
  return null
}

export async function GET(req: NextRequest) {
  const q            = req.nextUrl.searchParams.get("q")?.trim()
  const pollId       = req.nextUrl.searchParams.get("pollId")?.trim()
  const contestantId = req.nextUrl.searchParams.get("contestantId")?.trim()

  if (!q && !contestantId) {
    return NextResponse.json({ error: "Enter an email, phone number, or reference to search." }, { status: 400 })
  }
  if (!pollId) {
    return NextResponse.json({ error: "pollId is required" }, { status: 400 })
  }

  try {
    const base = adminDb
      .collection("Reference")
      .where("transactionType", "==", "voting_purchase")
      .where("pollId", "==", pollId)

    const queries: Promise<FirebaseFirestore.QuerySnapshot>[] = []

    if (q) {
      queries.push(
        base.where("payerEmail", "==", q).limit(MAX_RESULTS).get(),
        base.where("payerPhone", "==", q).limit(MAX_RESULTS).get(),
        base.where("reference", "==", q).limit(MAX_RESULTS).get(),
      )
    }

    if (contestantId) {
      // ── statsVisible gate ──────────────────────────────────────────────
      // Searching by contestantId returns every vote made toward that
      // contestant — that's candidate-level stats, so it's only allowed
      // when the organizer has explicitly made stats visible for this poll.
      const pollSnap = await adminDb.collection("voting").doc(pollId).get()
      const statsVisible = pollSnap.exists ? (pollSnap.data()?.statsVisible ?? true) : true

      if (!statsVisible) {
        return NextResponse.json(
          {
            error:
              "Use reference, email or phone number to check vote count, using contestantId is only enabled if the organizer of this poll allows candidate stats to be visible",
          },
          { status: 403 },
        )
      }

      queries.push(base.where("contestantId", "==", contestantId).limit(MAX_RESULTS).get())
    }

    const snapshots = await Promise.all(queries)

    const merged = new Map<string, PaymentMatch>()

    for (const snap of snapshots) {
      for (const doc of snap.docs) {
        if (merged.has(doc.id)) continue
        const d = doc.data()
        merged.set(doc.id, {
          reference:      d.reference ?? doc.id,
          status:         d.status ?? "pending",
          contestantId:   d.contestantId ?? null,
          contestantName: d.contestantName ?? "Unknown contestant",
          voteCount:      Number(d.voteCount ?? 0),
          totalAmount:    Number(d.totalAmount ?? 0),
          pollName:       d.pollName ?? "",
          pollId:         d.pollId ?? d.voteId ?? pollId,
          createdAt:      toIso(d.updatedAt) ?? toIso(d.createdAt),
          payerEmail:     d.payerEmail ?? null,
          payerPhone:     d.payerPhone ?? null,
        })
      }
    }

    const results = Array.from(merged.values())
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
      .slice(0, MAX_RESULTS)

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error("[vote/check-payment] Error:", err)
    return NextResponse.json({ error: "Failed to search payments. Please try again." }, { status: 500 })
  }
}

