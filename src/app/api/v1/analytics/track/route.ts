// app/api/v1/analytics/track/route.ts
//
// POST /api/v1/analytics/track
//   Body: { eventId, type: "EVENT_PAGE_VIEW" | "CHECKOUT_STARTED", visitorId? }
//
// Trusted server-side ingestion endpoint for browser-originated Numerox
// tracking. Only the two visitor-behavior event types are accepted here
// — payment-lifecycle events are tracked directly from server code that
// already has a real payment reference (create-pay-ref/route.ts, and
// spotix-backend's webhook), never from this public endpoint, so a
// buyer's browser can never fabricate a PAYMENT_SUCCESS.
//
// No auth required — event page views and checkout starts happen before
// (and often without) a Spotix login, same as ticket purchase itself.
//
// Device and location are resolved from the request itself wherever
// possible (User-Agent header, edge geo headers), never trusted verbatim
// from the browser — see the inline comment below for the one exception
// (a validated Nigerian state name, used only as a fallback when no
// edge geo signal is present on this host). Both are best-effort and
// optional — see request-device.ts / request-geo.ts — a request with
// neither resolvable still tracks the funnel event itself just fine.

import { NextRequest, NextResponse } from "next/server"
import { numerox } from "@/app/lib/numerox"
import { NumeroxValidationError } from "@drexx-codes/numerox"
import { classifyDeviceType } from "@/app/lib/request-device"
import { resolveRequestLocation } from "@/app/lib/request-geo"
import { NIGERIAN_STATES } from "@/app/lib/geo-client"

const BROWSER_ALLOWED_TYPES = new Set(["EVENT_PAGE_VIEW", "CHECKOUT_STARTED"])
const ALLOWED_DEVICE_TYPES = new Set(["android", "ios", "windows", "mac", "linux", "tablet", "unknown"])

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { eventId, type, visitorId, clientLocationState, clientDevice } = body ?? {}

  if (typeof type !== "string" || !BROWSER_ALLOWED_TYPES.has(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${[...BROWSER_ALLOWED_TYPES].join(", ")}` },
      { status: 400 }
    )
  }

  // Device and location are resolved from the request itself wherever
  // possible (User-Agent header, edge geo headers) so they can't be
  // spoofed. `resolveRequestLocation` only has a signal on hosts that
  // inject Vercel-style edge geo headers, though — on any other host
  // (or behind a proxy that strips them) it always comes back `null`.
  // `clientLocationState` is the fallback for exactly that case: the
  // event page's location popup resolves it via /api/v1/geo/state,
  // which has its own edge-header AND ip-lookup fallbacks server-side,
  // so it still works even when Vercel's headers aren't present. It's
  // only trusted as a fallback, and only once validated against the
  // known state list, so a tampered request can't inject arbitrary text.
  const serverDevice = classifyDeviceType(request.headers.get("user-agent"))
  const device =
    serverDevice !== "unknown"
      ? serverDevice
      : typeof clientDevice === "string" && ALLOWED_DEVICE_TYPES.has(clientDevice)
        ? (clientDevice as typeof serverDevice)
        : serverDevice

  const serverLocation = resolveRequestLocation(request)
  const validClientState =
    typeof clientLocationState === "string" && (NIGERIAN_STATES as readonly string[]).includes(clientLocationState)
      ? clientLocationState
      : null
  const location = serverLocation ?? (validClientState ? { country: `${validClientState}, NG` } : undefined)

  try {
    numerox.track({
      eventId: eventId as string,
      type: type as "EVENT_PAGE_VIEW" | "CHECKOUT_STARTED",
      visitorId: typeof visitorId === "string" ? visitorId : undefined,
      device,
      location,
    })
    await numerox.flush()
  } catch (err) {
    // A bad eventId is the only thing that throws synchronously from
    // numerox.track() — everything else (storage failures) is isolated
    // internally. Surface just that one as a 400; anything else is
    // unexpected and logged, but still doesn't fail the response —
    // analytics must never look like a broken page to the buyer.
    if (err instanceof NumeroxValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error("[api/v1/analytics/track] unexpected error", err)
  }

  return NextResponse.json({ success: true }, { status: 202 })
}
