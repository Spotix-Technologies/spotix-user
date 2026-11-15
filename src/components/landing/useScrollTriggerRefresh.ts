"use client"

/**
 * useScrollTriggerRefresh — keeps GSAP ScrollTrigger positions in sync with the real layout.
 *
 * ScrollTrigger measures every trigger's start/end position ONCE, when it is created.
 * On the landing page the document height changes after that (the page is ~1,850px shorter
 * a moment after hydration once content/fonts/images settle), so triggers created earlier
 * sit too far down the page. On mobile that showed up as the Creators / Booker / Newsletter
 * sections staying invisible (opacity 0) until you scrolled almost to the footer.
 *
 * Fix: re-measure whenever the page height changes, once the window has loaded, and once
 * web fonts are ready. Call ONCE at the root (LandingClient). Parent effects run after
 * children's effects, so the triggers already exist by the time this first refreshes.
 */

import { useEffect } from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export function useScrollTriggerRefresh(): void {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    let timer: number | undefined
    let disposed = false

    // Debounced: layout often settles in several small steps
    const refresh = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (!disposed) ScrollTrigger.refresh()
      }, 120)
    }

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(refresh) : null
    resizeObserver?.observe(document.body)

    window.addEventListener("load", refresh)
    document.fonts?.ready.then(refresh).catch(() => {})
    refresh()

    return () => {
      disposed = true
      window.clearTimeout(timer)
      resizeObserver?.disconnect()
      window.removeEventListener("load", refresh)
    }
  }, [])
}
