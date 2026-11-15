// app/lib/geo-client.ts
//
// Client-side helpers for resolving the visitor's Nigerian state via our
// own /api/v1/geo/state route (see that route's doc comment for the
// coordinates → edge-region → IP resolution order it uses server-side).
//
// Originally lived only inside discover/page-client.tsx; pulled out here
// so the event page's location popup (location-permission-popup.tsx) can
// share the exact same resolution contract instead of re-implementing
// its own — one geo-state integration, two call sites.

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const

// How /api/v1/geo/state resolved the state — surfaced so callers can tell
// a precise GPS/edge-coordinate fix apart from a coarse IP-block guess.
export type GeoSource = "coordinates" | "edge-coordinates" | "edge-region" | "ip" | null
export const PRECISE_GEO_SOURCES: GeoSource[] = ["coordinates", "edge-coordinates"]

export interface GeoStateResult {
  state: string | null
  source: GeoSource
}

/**
 * Calls /api/v1/geo/state, optionally with browser-supplied coordinates
 * for the precise path. Never throws — network/parse failures just
 * resolve to `{ state: null, source: null }` so callers can treat this
 * as best-effort the same way analytics tracking does.
 */
export async function fetchStateFromServer(coords?: { lat: number; lon: number }): Promise<GeoStateResult> {
  try {
    const params = coords ? `?lat=${coords.lat}&lon=${coords.lon}` : ""
    const res = await fetch(`/api/v1/geo/state${params}`)
    if (!res.ok) return { state: null, source: null }
    const data = await res.json()
    const state = data?.state && NIGERIAN_STATES.includes(data.state) ? data.state : null
    return { state, source: state ? (data?.source ?? null) : null }
  } catch {
    return { state: null, source: null }
  }
}

/**
 * Wraps navigator.geolocation.getCurrentPosition in a promise that always
 * resolves (never rejects) so callers can await one outcome regardless of
 * whether the browser grants, denies, or times out on the permission —
 * and immediately reverse-geocodes a successful fix via fetchStateFromServer.
 */
export function resolvePreciseState(): Promise<GeoStateResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ state: null, source: null })
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await fetchStateFromServer({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        resolve(result)
      },
      () => resolve({ state: null, source: null }),
      // maximumAge: 0 forces a fresh fix rather than reusing a cached one.
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })
}

/**
 * Best-effort read of the browser's current geolocation permission state,
 * without ever triggering the permission prompt itself. Not all browsers
 * support the Permissions API for "geolocation" — callers should treat a
 * `null` result the same as `"prompt"` (i.e. unknown, ask the user).
 */
export async function readGeolocationPermission(): Promise<PermissionState | null> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return null
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName })
    return status.state
  } catch {
    return null
  }
}
