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
