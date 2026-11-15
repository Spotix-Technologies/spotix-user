"use client"

import { useSyncExternalStore } from "react"

/** Live `matchMedia` match. `false` on the server and during hydration. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/**
 * Viewport width rounded UP to the nearest 100px, `0` on the server.
 * Rounding means a window drag doesn't re-mount a canvas on every pixel.
 */
export function useViewportWidth(): number {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("resize", onChange, { passive: true })
      return () => window.removeEventListener("resize", onChange)
    },
    () => Math.ceil(window.innerWidth / 100) * 100,
    () => 0,
  )
}
