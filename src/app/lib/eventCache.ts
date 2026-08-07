/**
 * lib/eventCache.ts
 *
 * Redis-cached, single-flight read layer for `events/{eventId}` documents.
 *
 * This is the one place that actually touches Firestore for an event's
 * public-facing data. Both the SSR event page (page.tsx) and the client
 * poll route (/api/v1/event) read through here instead of calling
 * adminDb directly, so:
 *
 *   1. A cache hit never touches Firestore.
 *   2. A cache miss only ever sends ONE Firestore read per event, no
 *      matter how many requests land on it at the same instant — the
 *      rest ride the single-flight lock in lib/redis.ts and read the
 *      cache the winner just populated ("first past the post").
 *   3. Both entry points share the same cache entry, so an SSR page load
 *      followed a moment later by the client-side poll doesn't double the
 *      Firestore hit either.
 *
 * Call `invalidateEventCache(eventId)` after any write to an event doc
 * (ticket purchase, edits, etc.) so the next read isn't stale for the
 * full TTL. See api/v1/atomic/route.ts for an example.
 */

import { adminDb } from "./firebase-admin"
import { getOrSetSingleFlight, cacheDel } from "./redis"

// Ticket availability changes on every purchase, so keep this short — long
// enough to absorb a burst of clicks on a popular link, short enough that
// "Only 2 left!" doesn't lag reality for long even if invalidation is ever
// missed somewhere.
const EVENT_CACHE_TTL_SECONDS = 30

const eventCacheKey = (eventId: string) => `event:doc:${eventId}`

export type RawEventDoc = Record<string, any> & { id: string }

async function fetchEventDocFromFirestore(eventId: string): Promise<RawEventDoc | null> {
  const snap = await adminDb.collection("events").doc(eventId).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() }
}

/**
 * Cached, single-flight read of the raw `events/{eventId}` document.
 * Returns the same shape Firestore would (plus `id`) — callers transform
 * it into whatever response shape they need.
 */
export async function getCachedEventDoc(eventId: string): Promise<RawEventDoc | null> {
  return getOrSetSingleFlight<RawEventDoc>(
    eventCacheKey(eventId),
    EVENT_CACHE_TTL_SECONDS,
    () => fetchEventDocFromFirestore(eventId)
  )
}

/** Call after any write to events/{eventId} so the next read is fresh. */
export async function invalidateEventCache(eventId: string): Promise<void> {
  await cacheDel(eventCacheKey(eventId))
}
