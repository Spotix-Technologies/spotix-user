/**
 * src/app/api/v1/polls/nominations/[pollId]/nominees/route.ts
 *
 * GET /api/v1/polls/nominations/:pollId/nominees?categoryId=xxx
 * Public. Returns nominees for one category, sorted by nomination count
 * descending. Cached in Redis for 20s since this is read-heavy (every
 * visitor to the nominate page loads it) and a few seconds of staleness
 * is fine for a live nomination count.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { cacheGet, cacheSet } from "@/app/lib/redis"

const CACHE_TTL_SECONDS = 20

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const { pollId } = await params
  const categoryId = req.nextUrl.searchParams.get("categoryId")

  if (!categoryId?.trim()) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 })
  }

  const cacheKey = `nominees:${pollId}:${categoryId}`

  const cached = await cacheGet<{ nomineeId: string; name: string; count: number }[]>(cacheKey)
  if (cached) {
    return NextResponse.json({ success: true, nominees: cached, cached: true })
  }

  try {
    const snap = await adminDb
      .collection("nominationPolls")
      .doc(pollId)
      .collection("nominees")
      .where("categoryId", "==", categoryId)
      .orderBy("count", "desc")
      .get()

    const nominees = snap.docs.map((doc) => {
      const d = doc.data()
      return { nomineeId: doc.id, name: d.displayName ?? d.name ?? "", count: d.count ?? 0 }
    })

    await cacheSet(cacheKey, nominees, CACHE_TTL_SECONDS)

    return NextResponse.json({ success: true, nominees, cached: false })
  } catch (err) {
    console.error("[GET /api/v1/polls/nominations/[pollId]/nominees] error:", err)
    return NextResponse.json({ error: "Failed to fetch nominees" }, { status: 500 })
  }
}
