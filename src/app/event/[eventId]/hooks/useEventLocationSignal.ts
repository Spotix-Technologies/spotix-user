"use client"

// app/event/[eventId]/hooks/useEventLocationSignal.ts
//
// Coordinates location + device resolution for the event page's Numerox
// tracking. Two tiers, cheapest-first:
//
//  1. No-permission fallback — fires on mount, no popup involved. Calls
//     /api/v1/geo/state with no coordinates, which resolves server-side
//     via edge geo headers or an IP lookup (see that route's doc
//     comment). This alone fixes the common "location never resolves"
//     case: request-geo.ts's server-side resolver only has a signal on
//     hosts that inject Vercel-style edge headers, so on any other host
//     it always came back null before this existed.
//
//  2. Precise GPS — only if the browser's geolocation permission is
//     already "granted" (silent, no popup) or the visitor explicitly
//     allows it via the on-page popup. Reverse-geocoded the same way,
//     just with real coordinates for a state-level fix instead of a
//     coarse edge/IP guess.
//
// Device type is classified synchronously client-side (no popup or
// permission needed for that part) using the same pure classifier the
// ingestion route falls back to server-side.

import { useCallback, useEffect, useRef, useState } from "react"
import { fetchStateFromServer, resolvePreciseState, readGeolocationPermission, type GeoStateResult } from "@/app/lib/geo-client"
import { classifyDeviceType } from "@/app/lib/request-device"
import type { ClientLocationDevice } from "@/app/lib/numerox-track-client"

// Remembers that this visitor has already been asked (allowed, dismissed,
// or the browser itself reports "denied") so the popup only ever shows
// once per browser, not once per event page visited.
const ASKED_STORAGE_KEY = "spotix_location_prompt_seen"
// Give the page a beat to render before asking for anything — the popup
// should feel like a follow-up, not something blocking first paint.
const POPUP_DELAY_MS = 2500

function hasBeenAskedBefore(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(ASKED_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function markAsked() {
  try {
    window.localStorage.setItem(ASKED_STORAGE_KEY, "1")
  } catch {
    // Private browsing / storage disabled — fine to just ask again next time.
  }
}

export function useEventLocationSignal() {
  const [popupVisible, setPopupVisible] = useState(false)
  const ipStatePromise = useRef<Promise<GeoStateResult> | null>(null)
  const preciseState = useRef<string | null>(null)

  useEffect(() => {
    // Tier 1 — kick off immediately, no permission required.
    ipStatePromise.current = fetchStateFromServer()

    let popupTimer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    ;(async () => {
      if (hasBeenAskedBefore()) return

      const permission = await readGeolocationPermission()
      if (cancelled) return

      if (permission === "granted") {
        // Already allowed on a previous visit — resolve precisely in the
        // background, no need to ask again.
        const precise = await resolvePreciseState()
        if (!cancelled && precise.state) preciseState.current = precise.state
        return
      }

      if (permission === "denied") {
        // Browser-level denial — respect it, don't keep asking.
        markAsked()
        return
      }

      // "prompt" or unsupported Permissions API — ask via the on-page popup.
      popupTimer = setTimeout(() => {
        if (!cancelled) setPopupVisible(true)
      }, POPUP_DELAY_MS)
    })()

    return () => {
      cancelled = true
      if (popupTimer) clearTimeout(popupTimer)
    }
  }, [])

  const handleAllow = useCallback(async () => {
    setPopupVisible(false)
    markAsked()
    const precise = await resolvePreciseState()
    if (precise.state) preciseState.current = precise.state
  }, [])

  const handleDismiss = useCallback(() => {
    setPopupVisible(false)
    markAsked()
  }, [])

  // Handed to useNumeroxTrack, which awaits this (with its own bounded
  // timeout) before firing the pageview ping — see numerox-track-client.ts.
  const getClientLocationDevice = useCallback(async (): Promise<ClientLocationDevice | null> => {
    const device = typeof navigator !== "undefined" ? classifyDeviceType(navigator.userAgent) : "unknown"
    if (preciseState.current) return { state: preciseState.current, device }
    const ip = ipStatePromise.current ? await ipStatePromise.current : null
    return { state: ip?.state ?? null, device }
  }, [])

  return {
    showLocationPopup: popupVisible,
    onAllowLocation: handleAllow,
    onDismissLocationPopup: handleDismiss,
    getClientLocationDevice,
  }
}
