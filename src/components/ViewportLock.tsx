"use client"

import { useEffect } from "react"

/**
 * Makes the page behave like a native app on touch devices: no pinch zoom,
 * no double-tap zoom, no zoom when focusing inputs.
 *
 * iOS Safari ignores `maximum-scale` / `user-scalable=no` for accessibility,
 * so the viewport meta alone is not enough there — these listeners cover it.
 */
export function ViewportLock() {
  useEffect(() => {
    const block = (e: Event) => e.preventDefault()

    // iOS pinch gestures
    document.addEventListener("gesturestart", block)
    document.addEventListener("gesturechange", block)
    document.addEventListener("gestureend", block)

    // Multi-finger touch (pinch) on other browsers
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault()
    }
    document.addEventListener("touchmove", onTouchMove, { passive: false })

    // Double-tap zoom is handled by `touch-action` in globals.css. A JS
    // touchend blocker is deliberately avoided: it would swallow rapid taps
    // on +/- steppers and similar buttons.

    return () => {
      document.removeEventListener("gesturestart", block)
      document.removeEventListener("gesturechange", block)
      document.removeEventListener("gestureend", block)
      document.removeEventListener("touchmove", onTouchMove)
    }
  }, [])

  return null
}
