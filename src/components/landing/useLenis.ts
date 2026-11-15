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
import { lockRootScroll } from "./hero-scroll/scroll-lock"

let _lenis: Lenis | null = null
let _locked = false

export function getLenis(): Lenis | null {
  return _lenis
}

/**
 * Pause / resume ALL page scrolling (e.g. while the hero is capturing the wheel):
 * stops Lenis and locks native scroll on <html>.
 * Safe to call before Lenis exists — child effects run before the parent's
 * useLenisInit effect, so the desired state is remembered and applied on init.
 */
export function setLenisLocked(locked: boolean): void {
  _locked = locked
  lockRootScroll(locked) // Lenis.stop() alone does not block native scrolling
  if (!_lenis) return
  if (locked) _lenis.stop()
  else _lenis.start()
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
    if (_locked) lenis.stop()

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