/**
 * src/app/api/v1/polls/nominate/route.ts
 *
 * POST /api/v1/polls/nominate
 * Body: { pollId, categoryId, name, deviceId }
 *
 * Public — anyone can nominate anyone into an open category. Guards:
 *   1. Rate limit: 8 submissions / min / IP (Redis, fails open if Redis is down)
 *   2. One nomination per category per device (deviceId, persisted client-side)
 *   3. One nomination per category per IP (hashed, server-side — harder to
 *      bypass than deviceId alone since localStorage can be cleared)
 *   4. Nomination Threshold: if the poll has one set, a nominee who's
 *      already at/over it is rejected with a distinct "maxed" error —
 *      they've qualified for the real vote, no more nominations needed.
 *
 * The nominated name is normalised (trim + lowercase + collapsed
 * whitespace) for de-duplication: nominating "John Doe" and "john  doe"
 * both increment the same nominee's count. displayName keeps the casing
 * of whoever nominated that name first.
 *
 * Data source: Supabase. Guard checks (2) and (3) plus the count
 * increment used to be a Firestore transaction — that's now the
 * submit_nomination() Postgres function (see submitNomination() in
 * lib/nomination-db.ts and the function itself in
 * /supabase/schema.sql), which is atomic for the same reason a
 * Firestore transaction was: it either fully applies or fully rolls
 * back.
 */

import { NextRequest, NextResponse } from "next/server"
import { fetchNominationPoll, submitNomination } from "@/app/lib/nomination-db"
import { checkRateLimit, cacheGet, cacheSet } from "@/app/lib/redis"
import { getRequestIp, hashIp } from "@/app/lib/request-ip"
import {
  normalizeNomineeName,
  nomineesCacheKey,
  NOMINEE_CACHE_TTL_SECONDS,
  NOMINEE_LIST_LIMIT,
  MIN_NOMINEE_NAME_LENGTH,
  MAX_NOMINEE_NAME_LENGTH,
} from "@/app/lib/nomination-config"

const RATE_LIMIT_PER_MINUTE = 8

type CachedNominee = { nomineeId: string; name: string; count: number }

/**
 * Updates (or inserts) one nominee's entry in the cached list and
 * re-sorts, instead of deleting the whole cache entry on every write.
 *
 * If nothing is cached yet (cold key, or it already expired), this is a
 * no-op — the next real reader will do a normal cache-miss fetch and
 * repopulate it. We deliberately don't fetch-and-cache from here, since
 * that would just move the stampede risk rather than remove it.
 */
async function patchNomineesCache(pollId: string, categoryId: string, updated: CachedNominee) {
  const cacheKey = nomineesCacheKey(pollId, categoryId)
  const cached = await cacheGet<CachedNominee[]>(cacheKey)
  if (!cached) return

  const next = [...cached]
  const idx = next.findIndex((n) => n.nomineeId === updated.nomineeId)
  if (idx === -1) {
    next.push(updated)
  } else {
    next[idx] = updated
  }
  next.sort((a, b) => b.count - a.count)

  await cacheSet(cacheKey, next.slice(0, NOMINEE_LIST_LIMIT), NOMINEE_CACHE_TTL_SECONDS)
}

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req)

  // ── 1. Rate limit ────────────────────────────────────────────────────────
  const { allowed } = await checkRateLimit(`rl:nominate:${ip}`, RATE_LIMIT_PER_MINUTE)
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many nominations from this connection. Please slow down and try again shortly." },
      { status: 429 }
    )
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { pollId, categoryId, name, deviceId } = body

  if (!pollId?.trim())     return NextResponse.json({ error: "pollId is required" }, { status: 400 })
  if (!categoryId?.trim()) return NextResponse.json({ error: "categoryId is required" }, { status: 400 })
  if (!deviceId?.trim())   return NextResponse.json({ error: "deviceId is required" }, { status: 400 })

  const trimmedName = String(name ?? "").trim()
  if (trimmedName.length < MIN_NOMINEE_NAME_LENGTH || trimmedName.length > MAX_NOMINEE_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Name must be between ${MIN_NOMINEE_NAME_LENGTH} and ${MAX_NOMINEE_NAME_LENGTH} characters` },
      { status: 400 }
    )
  }

  try {
    const poll = await fetchNominationPoll(pollId)
    if (!poll) return NextResponse.json({ error: "Nomination poll not found" }, { status: 404 })

    if (poll.status !== "active") {
      return NextResponse.json({ error: "Nominations are closed for this poll" }, { status: 409 })
    }
    if (!poll.categories.some((c) => c.categoryId === categoryId)) {
      return NextResponse.json({ error: "Category not found on this poll" }, { status: 404 })
    }

    const ipHash = hashIp(ip)
    const normalizedName = normalizeNomineeName(trimmedName)

    const result = await submitNomination({
      pollId,
      categoryId,
      deviceId,
      ipHash,
      normalizedName,
      displayName: trimmedName,
      threshold: poll.nominationThreshold,
    })

    if (result.alreadyNominated) {
      return NextResponse.json(
        { error: "You've already nominated someone in this category" },
        { status: 409 }
      )
    }

    if (result.maxed) {
      // Nomination Threshold reached — this candidate has already
      // qualified for the real vote, nothing was written.
      return NextResponse.json(
        {
          error: "This candidate has already reached the maximum number of nominations and has qualified for the real vote.",
          maxed: true,
        },
        { status: 409 }
      )
    }

    // Patch the cached nominee list in place instead of deleting it.
    //
    // This used to be `cacheDel(...)`, which forced the *next* reader back
    // to the database for a full nominee-list query. Fine at low volume —
    // but during a burst of nominations (exactly when read traffic from
    // onlookers also spikes), every single submission was blowing away
    // the cache for everyone, so concurrent viewers all missed
    // simultaneously and each re-ran the full nominees query. Updating
    // the one changed entry locally keeps the cache warm through a burst
    // instead of resetting it every write.
    await patchNomineesCache(pollId, categoryId, {
      nomineeId: result.nomineeId,
      name: result.name,
      count: result.count,
    })

    return NextResponse.json({ success: true, message: "Nomination recorded" }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/v1/polls/nominate] error:", err)
    return NextResponse.json({ error: "Failed to record nomination" }, { status: 500 })
  }
}
