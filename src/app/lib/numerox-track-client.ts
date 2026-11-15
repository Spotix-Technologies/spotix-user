// app/lib/numerox-track-client.ts
//
// Browser-side half of Numerox tracking. Never talks to Firestore or
// numerox's server client directly — posts to this app's own trusted
// ingestion route (api/v1/analytics/track/route.ts), which is the only
// thing allowed to call numerox.track() with a browser-originated event.
//
// Only EVENT_PAGE_VIEW and CHECKOUT_STARTED are fired from here.
// Payment-lifecycle events (PAYMENT_CREATED/SUCCESS/FAILED) are tracked
// from trusted server code that already holds the real payment
// reference (create-pay-ref/route.ts, and spotix-backend's webhook) —
// never from the browser, which could otherwise fabricate them.

"use client"

import { useEffect, useRef } from "react"
import { getOrCreateVisitorId, browserLocalStorageAdapter } from "@drexx-codes/numerox"

type BrowserTrackType = "EVENT_PAGE_VIEW" | "CHECKOUT_STARTED"

/** Resolved on the client — see location-permission-popup.tsx — and merged
 *  into the track call as a fallback for whatever the server itself
 *  couldn't resolve (edge geo headers, in particular, aren't present on
 *  every host). Optional: a caller with nothing to offer yet just omits it. */
export interface ClientLocationDevice {
  state?: string | null
  device?: string | null
}

// How long useNumeroxTrack will hold the ping open waiting for
// `getClientLocationDevice` to resolve, at most. /api/v1/geo/state's
// no-permission-required path (edge headers / IP lookup) typically
// resolves in well under a second, so this is generous headroom without
// meaningfully delaying the pageview signal if it's ever slow or hangs.
const CLIENT_GEO_WAIT_MS = 1500

/**
 * Fires one Numerox funnel event once `eventId` is available — exactly
 * once per mount (the ref guard makes this safe under React Strict
 * Mode's double-invoke). Silently no-ops on any failure: analytics must
 * never surface as user-visible breakage or a console error the buyer
 * sees. See numerox's own tracking/tracker.ts for the same principle
 * applied server-side.
 *
 * `getClientLocationDevice`, if supplied, is awaited (up to
 * `CLIENT_GEO_WAIT_MS`) before the ping fires, so a fast client-side geo
 * resolution (e.g. from the event page's location popup) can ride along
 * on the very first pageview instead of only benefiting later calls.
 */
export function useNumeroxTrack(
  eventId: string | null | undefined,
  type: BrowserTrackType,
  enabled = true,
  getClientLocationDevice?: () => Promise<ClientLocationDevice | null>
) {
  const fired = useRef(false)

  useEffect(() => {
    if (!enabled || !eventId || fired.current) return
    fired.current = true

    const storage = browserLocalStorageAdapter()
    const visitorId = storage ? getOrCreateVisitorId(eventId, storage) : undefined

    const send = (clientLocationDevice: ClientLocationDevice | null) => {
      fetch("/api/v1/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          type,
          visitorId,
          clientLocationState: clientLocationDevice?.state ?? undefined,
          clientDevice: clientLocationDevice?.device ?? undefined,
        }),
        // Best-effort delivery even if the buyer navigates away immediately
        // after this fires (e.g. straight into checkout).
        keepalive: true,
      }).catch(() => {
        // Intentionally swallowed — see doc comment above.
      })
    }

    if (!getClientLocationDevice) {
      send(null)
      return
    }

    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      send(null)
    }, CLIENT_GEO_WAIT_MS)

    getClientLocationDevice()
      .then((result) => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        send(result)
      })
      .catch(() => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        send(null)
      })
  }, [enabled, eventId, type, getClientLocationDevice])
}
