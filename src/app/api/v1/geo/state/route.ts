/**
 * GET /api/v1/geo/state
 * GET /api/v1/geo/state?lat=6.5&lon=3.4
 *
 * Resolves the caller's Nigerian state so the Discover page can auto-select
 * it without relying solely on the browser's geolocation permission (which
 * users frequently deny, and which the client previously tried to resolve
 * itself via a direct, unauthenticated call to Nominatim — unreliable, since
 * browsers silently strip custom User-Agent headers and Nominatim's usage
 * policy expects a real one).
 *
 * Resolution order (most to least precise):
 * 1. `lat`/`lon` query params (from navigator.geolocation on the client) —
 *    reverse-geocoded server-side via Nominatim with a proper User-Agent.
 * 2. Edge-provided geolocation headers (e.g. Vercel's `x-vercel-ip-*`
 *    headers), which carry an approximate lat/lon resolved at the CDN edge.
 *    When present we reverse-geocode those coordinates too, and only fall
 *    back to the header's coarse region code if that fails.
 * 3. A generic third-party IP-geolocation lookup, as the last resort.
 *
 * Step 3 is deliberately last: free IP-to-city databases routinely resolve
 * an entire mobile network's IP block to whichever city its gateway/NAT
 * exit sits in — in Nigeria this commonly means South-East traffic (e.g.
 * Anambra, Enugu, Imo, Ebonyi, Abia) gets attributed to Rivers/Port
 * Harcourt, a major regional gateway hub. Steps 1-2 use actual coordinates
 * instead of a coarse IP-block guess, so they don't share that failure mode.
 */
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers",
  "Sokoto","Taraba","Yobe","Zamfara",
]

/** Normalizes a free-form state string (from Nominatim or an IP-geo provider) to our canonical list. */
function normalizeStateName(raw: string): string | null {
  const cleaned = raw
    .replace(/ State$/i, "")
    .replace(/ Capital Territory$/i, "")
    .replace(/^Federal Capital Territory$/i, "FCT")
    .trim()

  const match = NIGERIAN_STATES.find(
    (s) =>
      s.toLowerCase() === cleaned.toLowerCase() ||
      s.toLowerCase().replace(/\s+/g, "") === cleaned.toLowerCase().replace(/\s+/g, "")
  )
  return match || null
}

// ISO 3166-2:NG subdivision codes, as surfaced (sans "NG-" prefix) by CDN/edge
// geolocation headers — used as a coarse fallback when no lat/lon is available.
const NG_ISO_REGION: Record<string, string> = {
  AB: "Abia", AD: "Adamawa", AK: "Akwa Ibom", AN: "Anambra", BA: "Bauchi",
  BY: "Bayelsa", BE: "Benue", BO: "Borno", CR: "Cross River", DE: "Delta",
  EB: "Ebonyi", ED: "Edo", EK: "Ekiti", EN: "Enugu", FC: "FCT", GO: "Gombe",
  IM: "Imo", JI: "Jigawa", KD: "Kaduna", KN: "Kano", KT: "Katsina", KE: "Kebbi",
  KO: "Kogi", KW: "Kwara", LA: "Lagos", NA: "Nasarawa", NI: "Niger", OG: "Ogun",
  ON: "Ondo", OS: "Osun", OY: "Oyo", PL: "Plateau", RI: "Rivers", SO: "Sokoto",
  TA: "Taraba", YO: "Yobe", ZA: "Zamfara",
}

/**
 * Reads CDN/edge-injected geolocation headers (present on Vercel's Edge and
 * Serverless runtimes). These are derived per-request at the edge and, when
 * they include a lat/lon, are meaningfully more precise than a generic
 * third-party IP-block lookup — they update per-request rather than being
 * keyed off a whole ISP/ASN block. Returns both the (optional) coordinates
 * and a coarse region-code fallback, letting the caller prefer the former.
 */
function edgeGeoHint(req: NextRequest): { coords: { lat: string; lon: string } | null; state: string | null } {
  const country = req.headers.get("x-vercel-ip-country")
  if (country && country.toUpperCase() !== "NG") return { coords: null, state: null }

  const lat = req.headers.get("x-vercel-ip-latitude")
  const lon = req.headers.get("x-vercel-ip-longitude")
  const regionCode = req.headers.get("x-vercel-ip-country-region")

  return {
    coords: lat && lon ? { lat, lon } : null,
    state: regionCode ? NG_ISO_REGION[regionCode.toUpperCase()] || null : null,
  }
}

function getClientIP(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("x-real-ip")
}

async function reverseGeocode(lat: string, lon: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1&zoom=8`,
      {
        headers: {
          "Accept-Language": "en-US,en",
          // Server-side calls keep a stable, policy-compliant User-Agent —
          // browsers strip/override this header on client-side fetches.
          "User-Agent": "SpotixApp/1.0 (support@spotix.com.ng)",
        },
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (data?.address?.country_code && data.address.country_code.toLowerCase() !== "ng") return null
    const rawState: string = data?.address?.state || data?.address?.county || data?.address?.region || ""
    if (!rawState) return null
    return normalizeStateName(rawState)
  } catch {
    return null
  }
}

async function ipToState(ip: string | null): Promise<string | null> {
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") return null
  try {
    const res = await fetch(`https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode,regionName`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.status !== "success") return null
    if (data?.countryCode && data.countryCode !== "NG") return null
    if (!data?.regionName) return null
    return normalizeStateName(data.regionName)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get("lat")
  const lon = searchParams.get("lon")

  // Precise path: coordinates supplied by the browser's geolocation API
  if (lat && lon) {
    const stateFromCoords = await reverseGeocode(lat, lon)
    if (stateFromCoords) {
      return NextResponse.json({ success: true, state: stateFromCoords, source: "coordinates" })
    }
    // Fall through to the edge-header / IP-based lookups below if reverse
    // geocoding didn't resolve to a known state.
  }

  // Edge-provided geolocation (e.g. Vercel): prefer this over a generic IP-DB
  // lookup, since it's resolved per-request at the CDN edge rather than being
  // a coarse per-ISP-block guess — see module doc comment for why that
  // distinction matters for South-East Nigerian traffic specifically.
  const edge = edgeGeoHint(request)
  if (edge.coords) {
    const stateFromEdgeCoords = await reverseGeocode(edge.coords.lat, edge.coords.lon)
    if (stateFromEdgeCoords) {
      return NextResponse.json({ success: true, state: stateFromEdgeCoords, source: "edge-coordinates" })
    }
  }
  if (edge.state) {
    return NextResponse.json({ success: true, state: edge.state, source: "edge-region" })
  }

  // Last-resort fallback: resolve from the request's IP address via a
  // generic third-party IP-geolocation service.
  const ip = getClientIP(request)
  const stateFromIP = await ipToState(ip)
  if (stateFromIP) {
    return NextResponse.json({ success: true, state: stateFromIP, source: "ip" })
  }

  return NextResponse.json({ success: false, state: null, source: null })
}
