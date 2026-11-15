// app/lib/request-geo.ts
//
// Coarse, zero-latency location resolution for background analytics
// pings (Numerox tracking). Deliberately NOT the same code path as
// api/v1/geo/state/route.ts, which does a full Nominatim/IP-DB
// reverse-geocode for the Discover page's "pick my state" UX — that's
// fine to spend a couple hundred ms on for a one-time page load, but a
// tracking ping fires on every event-page view and must stay cheap, so
// this only reads whatever the hosting edge already resolved into
// request headers. No outbound fetch, no added latency, no extra cost.
//
// NOTE ON GRANULARITY: Numerox's own DailyStats.locations aggregate is
// currently keyed off `location.country` only (see numerox's
// src/stats/aggregation.ts — region/city are accepted on
// TrackEventInput but not yet bucketed separately). Spotix's audience
// is overwhelmingly Nigerian, so a bare country would read as "Nigeria"
// on nearly every row and tell an organizer nothing — so when we can
// resolve a Nigerian state from the edge region code, we fold it into
// the label we hand Numerox as `country` (e.g. "Lagos, NG"), so the
// booker dashboard gets useful granularity today. `region`/`city` are
// still returned alongside it, unused by Numerox for now but ready for
// a future aggregation update without another call-site change.

import type { NextRequest } from "next/server"

// ISO 3166-2:NG subdivision codes → state name, exactly as surfaced by
// Vercel's edge geolocation headers. Mirrors the mapping in
// api/v1/geo/state/route.ts — kept as its own small copy so this stays
// a light, dependency-free helper safe to call on every page view.
const NG_ISO_REGION: Record<string, string> = {
  AB: "Abia", AD: "Adamawa", AK: "Akwa Ibom", AN: "Anambra", BA: "Bauchi",
  BY: "Bayelsa", BE: "Benue", BO: "Borno", CR: "Cross River", DE: "Delta",
  EB: "Ebonyi", ED: "Edo", EK: "Ekiti", EN: "Enugu", FC: "FCT", GO: "Gombe",
  IM: "Imo", JI: "Jigawa", KD: "Kaduna", KN: "Kano", KT: "Katsina", KE: "Kebbi",
  KO: "Kogi", KW: "Kwara", LA: "Lagos", NA: "Nasarawa", NI: "Niger", OG: "Ogun",
  ON: "Ondo", OS: "Osun", OY: "Oyo", PL: "Plateau", RI: "Rivers", SO: "Sokoto",
  TA: "Taraba", YO: "Yobe", ZA: "Zamfara",
}

export interface RequestLocation {
  /** What Numerox actually buckets today — a human-readable "State, CC"
   * (or bare country code when no state resolved). See module note. */
  country: string
  /** Raw resolved state/region name, if any — informational for now. */
  region?: string
  /** Edge-resolved city, if any — informational for now. */
  city?: string
}

/**
 * Resolves a coarse location purely from edge-injected request headers.
 * Returns `null` when nothing is available (local dev, non-Vercel
 * hosting, or a request with no edge geo data) rather than fabricating
 * a value — Numerox treats an absent `location` as "no data", not zero.
 */
export function resolveRequestLocation(req: Request | NextRequest): RequestLocation | null {
  const countryCode = req.headers.get("x-vercel-ip-country")
  if (!countryCode) return null

  const regionCode = req.headers.get("x-vercel-ip-country-region")
  const rawCity = req.headers.get("x-vercel-ip-city")
  const city = rawCity ? safeDecode(rawCity) : undefined

  const region =
    countryCode.toUpperCase() === "NG" && regionCode
      ? NG_ISO_REGION[regionCode.toUpperCase()]
      : regionCode ?? undefined

  const country = region ? `${region}, ${countryCode.toUpperCase()}` : countryCode.toUpperCase()

  return { country, region, city }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
