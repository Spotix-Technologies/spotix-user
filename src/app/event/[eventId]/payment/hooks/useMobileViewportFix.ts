// app/event/[eventId]/payment/hooks/useMobileViewportFix.ts
"use client"

import { useEffect } from "react"

/**
 * Mobile-only fix: iOS Safari auto-zooms the viewport when a focused
 * input's font-size is under 16px (see the discount/guest-checkout
 * inputs), and because getting here is a client-side route change (not a
 * full page load), that zoom level carries straight over from whatever
 * page/field the buyer was just on — landing them mid-scroll on a zoomed
 * page instead of at the top. Nudging the viewport meta's content forces
 * Safari to reset scale to 1 on mount; restoring the original content
 * right after keeps pinch-to-zoom working normally for the rest of the
 * visit.
 */
export function useMobileViewportFix(): void {
  useEffect(() => {
    if (typeof window === "undefined") return
    window.scrollTo(0, 0)

    const viewportMeta = document.querySelector('meta[name="viewport"]')
    const originalContent = viewportMeta?.getAttribute("content") ?? null
    if (viewportMeta && originalContent) {
      viewportMeta.setAttribute("content", `${originalContent}, maximum-scale=1`)
      const resetTimer = setTimeout(() => {
        viewportMeta.setAttribute("content", originalContent)
      }, 350)
      return () => clearTimeout(resetTimer)
    }
  }, [])
}
