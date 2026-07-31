/**
 * src/app/api/v1/polls/nominations/[pollId]/nominees/route.ts
 *
 * GET /api/v1/polls/nominations/:pollId/nominees?categoryId=xxx
 * Public. Returns the top NOMINEE_LIST_LIMIT nominees for one category,
 * sorted by nomination count descending. Cached in Redis for
 * NOMINEE_CACHE_TTL_SECONDS since this is read-heavy (every visitor to
 * the nominate page loads it) and a few seconds of staleness is fine for
 * a live nomination count.
 *
 * The write path (api/v1/polls/nominate) patches this same cache entry
 * in place after a successful nomination instead of deleting it, so a
 * burst of nominations doesn't stampede this route back to the database
 * for every concurrent viewer — see the comment there for why that
 * matters.
 *
 * Data source: Supabase (nomination_nominees table). This was the
 * single biggest source of Firestore read-quota exhaustion — a
 * cache-miss on a category with up to NOMINEE_LIST_LIMIT nominees used
 * to cost that many Firestore reads in one query. Postgres doesn't bill
 * per row read, so the same access pattern is no longer a quota risk.
 * See /README-SUPABASE-NOMINATIONS.md.
 */

import { NextRequest, NextResponse } from "next/server"
import { fetchTopNominees } from "@/app/lib/nomination-db"
import { cacheGet, cacheSet } from "@/app/lib/redis"
import { NOMINEE_LIST_LIMIT, NOMINEE_CACHE_TTL_SECONDS, nomineesCacheKey } from "@/app/lib/nomination-config"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  const { pollId } = await params
  const categoryId = req.nextUrl.searchParams.get("categoryId")

  if (!categoryId?.trim()) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 })
  }

  const cacheKey = nomineesCacheKey(pollId, categoryId)

  const cached = await cacheGet<{ nomineeId: string; name: string; count: number }[]>(cacheKey)
  if (cached) {
    return NextResponse.json({ success: true, nominees: cached, cached: true })
  }

  try {
    const nominees = await fetchTopNominees(pollId, categoryId, NOMINEE_LIST_LIMIT)

    await cacheSet(cacheKey, nominees, NOMINEE_CACHE_TTL_SECONDS)

    return NextResponse.json({ success: true, nominees, cached: false })
  } catch (err) {
    console.error("[GET /api/v1/polls/nominations/[pollId]/nominees] error:", err)
    return NextResponse.json({ error: "Failed to fetch nominees" }, { status: 500 })
  }
}
