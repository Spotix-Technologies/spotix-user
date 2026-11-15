"use client"

import { useEffect, useState } from "react"
import { MOBILE_BREAKPOINT } from "./constants"

/** Viewport + motion preferences used by the scroll-expand hero. */
export function useHeroViewport() {
  const [isMobile, setIsMobile] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    check()
    window.addEventListener("resize", check)

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduceMotion(mq.matches)
    const onMq = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mq.addEventListener("change", onMq)

    return () => {
      window.removeEventListener("resize", check)
      mq.removeEventListener("change", onMq)
    }
  }, [])

  return { isMobile, reduceMotion }
}
