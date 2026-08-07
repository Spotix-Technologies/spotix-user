/**
 * lib/redis.ts
 *
 * Same Upstash Redis instance used across Spotix services (see
 * spotix-booker/app/lib/redis.ts). Requires npm i @upstash/redis.
 *
 * Env vars (already provisioned for booker — reuse the same values here):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export function minuteBucket(date: Date = new Date()): string {
  return date.toISOString().slice(0, 16)
}

// ─── Rate limiting ──────────────────────────────────────────────────────────

/**
 * Fixed-window rate limit. Increments a per-key-per-minute counter and
 * returns whether the caller is still within `limit`. Cheap and good
 * enough for abuse protection on a public nomination endpoint (doesn't
 * need to be a perfectly smooth sliding window).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds = 60
): Promise<{ allowed: boolean; remaining: number }> {
  const bucketKey = `${key}:${minuteBucket()}`
  try {
    const count = await redis.incr(bucketKey)
    if (count === 1) {
      await redis.expire(bucketKey, windowSeconds)
    }
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
  } catch (err) {
    // If Redis is unreachable, fail open rather than blocking nominations
    // entirely — the Firestore device/IP checks still guard against abuse.
    console.error("[redis] rate limit check failed, failing open:", err)
    return { allowed: true, remaining: limit }
  }
}

// ─── Simple JSON cache helpers ────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get<T>(key)
    return value ?? null
  } catch (err) {
    console.error(`[redis] cacheGet failed for "${key}":`, err)
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttlSeconds })
  } catch (err) {
    console.error(`[redis] cacheSet failed for "${key}":`, err)
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (err) {
    console.error(`[redis] cacheDel failed for "${key}":`, err)
  }
}

// ─── Single-flight ("first past the post") cache ──────────────────────────
//
// On a cache miss, many concurrent requests can arrive for the same key at
// once (e.g. a popular event link getting hammered). Without coordination,
// every single one of them falls through to the origin (Firestore).
//
// This uses a short-lived Redis lock (`SET key val NX EX ttl`) to elect one
// "leader" request per key. The leader is the only one that races to the
// origin; it then populates the cache for everyone else. Followers don't
// touch Firestore at all — they just poll the cache, which the leader is
// about to fill. If the leader is unusually slow or crashes mid-flight, the
// lock naturally expires and followers fall back to fetching directly so
// nobody is stuck waiting forever.

const LOCK_TTL_SECONDS = 8
const FOLLOWER_POLL_INTERVAL_MS = 100
const FOLLOWER_MAX_WAIT_MS = 4000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Cached read with single-flight de-duplication on miss.
 *
 * @param key         Cache key
 * @param ttlSeconds  How long a fresh value stays cached
 * @param fetcher     Loads the value from the origin (e.g. Firestore) on a
 *                     true cache miss. Only the elected "leader" calls this
 *                     under normal conditions.
 */
export async function getOrSetSingleFlight<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T | null>
): Promise<T | null> {
  // 1. Fast path instant cache hit, no coordination needed.
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached

  // 2. Cache miss, the fun part: race for the lock. Whoever wins becomes the leader!.
  const lockKey = `lock:${key}`
  let isLeader = false
  try {
    const lockResult = await redis.set(lockKey, "1", { nx: true, ex: LOCK_TTL_SECONDS })
    isLeader = lockResult === "OK"
  } catch (err) {
    // Redis itself is unreachable :( fail open and hit the origin directly
    // rather than blocking the request.
    console.error(`[redis] lock acquisition failed for "${key}", fetching directly:`, err)
    return fetcher()
  }

  if (isLeader) {
    try {
      const fresh = await fetcher()
      if (fresh !== null) {
        await cacheSet(key, fresh, ttlSeconds)
      }
      return fresh
    } finally {
      // Best-effort unlock so the next genuine miss doesn't wait out the
      // full lock TTL unnecessarily. Not awaited-critical — if this fails,
      // the lock just expires on its own shortly after.
      cacheDel(lockKey).catch(() => {})
    }
  }

  // 3. Follower — someone else is already fetching. Poll the cache (never
  // Firestore) until the leader fills it in, or give up after a bounded
  // wait and fetch directly so a stuck/crashed leader can't wedge us.
  const start = Date.now()
  while (Date.now() - start < FOLLOWER_MAX_WAIT_MS) {
    await sleep(FOLLOWER_POLL_INTERVAL_MS)
    const value = await cacheGet<T>(key)
    if (value !== null) return value
  }

  console.warn(`[redis] single-flight follower timed out waiting for "${key}", fetching directly`)
  return fetcher()
}
