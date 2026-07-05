/**
 * src/app/api/v1/polls/[pollId]/route.ts
 *
 * GET /api/v1/polls/:pollId
 *
 * Fetches a single poll from the FLAT voting/{pollId} collection.
 * Public endpoint — no auth required (polls are publicly viewable).
 *
 * Supports both single and group polls (including nested subcategories).
 * Returns statsVisible, suspended, flagged, pollType, categories tree.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (typeof value === "object" && "_seconds" in (value as any))
    return new Date((value as any)._seconds * 1000).toISOString()
  if (typeof value === "string" || typeof value === "number")
    return new Date(value).toISOString()
  return new Date().toISOString()
}

/** Recursively serialize a category tree, normalising votes to 0 if missing */
function serializeCategories(cats: any[]): any[] {
  return (cats ?? []).map((cat: any) => ({
    categoryId:    cat.categoryId ?? "",
    name:          cat.name       ?? "",
    pollPrice:     cat.pollPrice  ?? 0,
    contestants:   (cat.contestants ?? []).map((c: any) => ({
      contestantId: c.contestantId ?? "",
      name:         c.name         ?? "",
      image:        c.image        ?? "",
      votes:        c.votes        ?? 0,
    })),
    subcategories: cat.subcategories ? serializeCategories(cat.subcategories) : [],
  }))
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> },
) {
  const { pollId } = await params

  if (!pollId?.trim()) {
    return NextResponse.json({ error: "pollId is required" }, { status: 400 })
  }

  try {
    const snap = await adminDb.collection("voting").doc(pollId).get()

    if (!snap.exists) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })
    }

    const d = snap.data()!

    const poll = {
      pollName:        d.pollName        ?? "",
      pollImage:       d.pollImage       ?? "",
      pollDescription: d.pollDescription ?? "",
      pollStartDate:   d.pollStartDate   ?? "",
      pollStartTime:   d.pollStartTime   ?? "",
      pollEndDate:     d.pollEndDate     ?? "",
      pollEndTime:     d.pollEndTime     ?? "",
      pollPrice:       d.pollPrice       ?? 0,
      pollAmount:      d.pollAmount      ?? 0,
      pollCount:       d.pollCount       ?? 0,
      pollType:        d.pollType        ?? "single",
      statsVisible:    d.statsVisible    ?? true,
      suspended:       d.suspended       ?? false,
      flagged:         d.flagged         ?? false,
      buyerBearsBurden: d.buyerBearsBurden ?? true,
      creatorId:       d.creatorId       ?? d.organizerId ?? "",
      pollCreation:    toIso(d.createdAt ?? d.pollCreation),

      pollEntries: (d.pollEntries ?? []).map((e: any) => ({
        ...e,
        date: e.date instanceof Timestamp ? e.date.toDate().toISOString() : e.date,
      })),

      // Single poll contestants
      contestants: (d.contestants ?? []).map((c: any) => ({
        contestantId: c.contestantId ?? "",
        name:         c.name         ?? "",
        image:        c.image        ?? "",
        votes:        c.votes        ?? 0,
      })),

      // Group poll categories (with nested subcategories)
      categories: d.categories ? serializeCategories(d.categories) : [],
    }

    return NextResponse.json({ success: true, poll, pollId }, { status: 200 })
  } catch (err) {
    console.error("[GET /api/v1/polls/[pollId]] Error:", err)
    return NextResponse.json({ error: "Failed to fetch poll" }, { status: 500 })
  }
}
