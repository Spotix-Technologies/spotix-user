/**
 * src/app/api/v1/polls/verify/route.ts
 *
 * GET /api/v1/polls/verify?ref={reference}
 *
 * Checks the status of a voting payment reference.
 * Reads from the `Reference` collection (same collection used by ticket
 * purchases — see backend v1/ticket.js).
 *
 * Returns:
 *   - transactionType
 *   - status  (pending | success | failed)
 *   - contestantId, contestantName, voteCount, updatedAt  (on success)
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")

  if (!ref?.trim()) {
    return NextResponse.json({ error: "ref query param is required" }, { status: 400 })
  }

  try {
    const snap = await adminDb.collection("Reference").doc(ref).get()

    if (!snap.exists) {
      return NextResponse.json({ error: "Reference not found" }, { status: 404 })
    }

    const d = snap.data()!

    // Serialize any Timestamp fields before sending to client
    const toIso = (v: unknown): string | null => {
      if (!v) return null
      if (typeof v === "string") return v
      if (typeof v === "object" && "seconds" in (v as any))
        return new Date((v as any).seconds * 1000).toISOString()
      return null
    }

    return NextResponse.json({
      success:         true,
      reference:       ref,
      transactionType: d.transactionType ?? null,
      status:          d.status          ?? "pending",
      // Vote details — only meaningful when status === "success"
      contestantId:    d.contestantId    ?? null,
      contestantName:  d.contestantName  ?? null,
      voteCount:       d.voteCount       ?? null,
      pollName:        d.pollName        ?? null,
      pollId:          d.pollId ?? d.voteId ?? null,
      updatedAt:       toIso(d.updatedAt) ?? toIso(d.paymentCompletedAt) ?? null,
    })
  } catch (err) {
    console.error("[GET /api/v1/polls/verify] Error:", err)
    return NextResponse.json({ error: "Failed to fetch reference" }, { status: 500 })
  }
}
