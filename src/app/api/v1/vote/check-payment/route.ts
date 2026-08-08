/**
 * src/app/api/v1/vote/check-payment/route.ts
 *
 * GET /api/v1/vote/check-payment?q={emailOrPhoneOrReference}&pollId={pollId}
 *
 * Lets a voter self-serve check whether a vote payment reflected, without
 * needing to be logged in. Searches the `Reference` collection (the same
 * collection voting_purchase docs are written to — see
 * /api/v1/vote/payref and /api/v1/polls/verify) for docs scoped to this
 * poll where payerEmail, payerPhone, or reference matches the query.
 *
 * Firestore doesn't support an OR across different fields in one query, so
 * this runs three equality queries in parallel and merges/dedupes the
 * results by reference. All three filters are plain equality (==) so no
 * composite index is required.
 *
 * Returns up to MAX_RESULTS most recent matches, newest first. The client
 * paginates through them locally 5-at-a-time via "Load More" — simpler and
 * cheaper than cursor-based pagination across three merged queries, and a
 * voter realistically never has more than a handful of votes on one poll
 * under the same email/phone/reference.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

const MAX_RESULTS = 50

interface PaymentMatch {
  reference:      string
  status:         string
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
  const q      = req.nextUrl.searchParams.get("q")?.trim()
  const pollId = req.nextUrl.searchParams.get("pollId")?.trim()

  if (!q) {
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

    const [byEmail, byPhone, byRef] = await Promise.all([
      base.where("payerEmail", "==", q).limit(MAX_RESULTS).get(),
      base.where("payerPhone", "==", q).limit(MAX_RESULTS).get(),
      base.where("reference", "==", q).limit(MAX_RESULTS).get(),
    ])

    const merged = new Map<string, PaymentMatch>()

    for (const snap of [byEmail, byPhone, byRef]) {
      for (const doc of snap.docs) {
        if (merged.has(doc.id)) continue
        const d = doc.data()
        merged.set(doc.id, {
          reference:      d.reference ?? doc.id,
          status:         d.status ?? "pending",
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
