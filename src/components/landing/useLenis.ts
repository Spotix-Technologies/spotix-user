/**
 * useLenis.ts — Singleton Lenis smooth-scroll hook.
 * Call useLenisInit() ONCE at the root (e.g. LandingClient).
 * Child components call getLenis() to get the running instance.
 *
 * Install: npm i lenis
 */

"use client"

import { useEffect, useRef } from "react"
import Lenis from "lenis"

let _lenis: Lenis | null = null

export function getLenis(): Lenis | null {
  return _lenis
}

export function useLenisInit(): void {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      smoothWheel: true,
    })

    _lenis = lenis
    lenisRef.current = lenis

    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      _lenis = null
    }
  }, [])
}