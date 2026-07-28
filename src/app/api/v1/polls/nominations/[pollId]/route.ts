/**
 * src/app/api/v1/polls/nominations/[pollId]/route.ts
 *
 * GET /api/v1/polls/nominations/:pollId
 * Public — fetches nomination poll metadata (name, image, categories) for
 * the /polls/nominate/[pollId] page.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { cacheGet, cacheSet } from "@/app/lib/redis"

const CACHE_TTL_SECONDS = 60

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const { pollId } = await params
  if (!pollId?.trim()) {
    return NextResponse.json({ error: "pollId is required" }, { status: 400 })
  }

  const cacheKey = `nomination-poll:${pollId}`
  const cached = await cacheGet<any>(cacheKey)
  if (cached) {
    return NextResponse.json({ success: true, poll: cached, cached: true })
  }

  try {
    const snap = await adminDb.collection("nominationPolls").doc(pollId).get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Nomination poll not found" }, { status: 404 })
    }

    const d = snap.data()!

    const poll = {
      pollId: snap.id,
      pollName: d.pollName ?? "",
      pollImage: d.pollImage ?? "",
      pollDescription: d.pollDescription ?? "",
      categories: d.categories ?? [],
      status: d.status ?? "active",
    }

    await cacheSet(cacheKey, poll, CACHE_TTL_SECONDS)

    return NextResponse.json({ success: true, poll, cached: false })
  } catch (err) {
    console.error("[GET /api/v1/polls/nominations/[pollId]] error:", err)
    return NextResponse.json({ error: "Failed to fetch nomination poll" }, { status: 500 })
  }
}
