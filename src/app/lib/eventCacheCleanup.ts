/**
 * lib/eventCacheCleanup.ts
 *
 * Housekeeping for the sessionStorage event cache ClientPage.tsx writes to
 * (`event_{eventId}_{createdBy}` → `{ data, timestamp }`, see the "Fetch
 * event data" effect there). That cache is keyed per-event and never
 * cleaned up on its own — sessionStorage only clears on tab close, so a
 * browser tab left open across many events (or just left open for days)
 * quietly accumulates one entry per event ever viewed.
 *
 * This doesn't touch Redis/Upstash — it's purely a client-side tidy-up —
 * but it's the same spirit as the rest of this pass: don't hang on to an
 * event's data any longer than the event itself is relevant. An event
 * whose eventEndDate has already passed has no reason to still be sitting
 * in sessionStorage, so it's swept on the next event page load.
 */

const EVENT_CACHE_KEY_PREFIX = "event_"

/**
 * Scans sessionStorage for stored event caches whose eventEndDate has
 * already passed and removes them. Safe to call on every event page
 * load — cheap (sessionStorage is local, synchronous, in-memory) and a
 * no-op once a tab's cache is already clean.
 */
export function cleanupExpiredEventCache(now: Date = new Date()): void {
  if (typeof window === "undefined") return

  try {
    const keysToRemove: string[] = []

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (!key || !key.startsWith(EVENT_CACHE_KEY_PREFIX)) continue

      try {
        const raw = sessionStorage.getItem(key)
        if (!raw) continue

        const parsed = JSON.parse(raw)
        const eventEndDate = parsed?.data?.eventEndDate
        if (!eventEndDate) continue // nothing to compare against — leave it, it'll fall out on its own TTL

        const endDate = new Date(eventEndDate)
        if (!isNaN(endDate.getTime()) && now > endDate) {
          keysToRemove.push(key)
        }
      } catch {
        // Malformed entry for this key specifically — skip it rather than
        // aborting the whole sweep.
        continue
      }
    }

    keysToRemove.forEach((key) => sessionStorage.removeItem(key))
  } catch (error) {
    // sessionStorage can throw in some privacy modes — never let cleanup
    // break the page it's running alongside.
    console.error("Error cleaning up expired event cache:", error)
  }
}
