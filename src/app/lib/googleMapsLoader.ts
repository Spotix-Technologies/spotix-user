// app/lib/googleMapsLoader.ts
//
// Loads the Google Maps JavaScript API (not the old maps/embed/v1 iframe)
// so pages can render an interactive google.maps.Map with real gesture
// control (see LocationSection) instead of an embedded page.
//
// NOTE: this reuses the same key that was already used for the Maps Embed
// iframe. "Maps JavaScript API" and "Geocoding API" need to be enabled for
// that key in Google Cloud Console — "Maps Embed API" being enabled is not
// enough on its own.

"use client"

const GOOGLE_MAPS_API_KEY = "AIzaSyCt1265A4qvZy9HKUeA8J15AOC4SrCyZe4"
const SCRIPT_ID = "google-maps-js-sdk"

let loadPromise: Promise<any> | null = null

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadGoogleMaps() called during SSR"))
  }

  const w = window as any

  if (w.google?.maps) {
    return Promise.resolve(w.google)
  }

  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const onLoad = () => {
      if ((window as any).google?.maps) resolve((window as any).google)
      else reject(new Error("Google Maps script loaded but window.google.maps is missing"))
    }
    const onError = () => reject(new Error("Failed to load Google Maps script"))

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", onLoad, { once: true })
      existing.addEventListener("error", onError, { once: true })
      return
    }

    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=weekly`
    script.async = true
    script.defer = true
    script.onload = onLoad
    script.onerror = onError
    document.head.appendChild(script)
  })

  return loadPromise
}
