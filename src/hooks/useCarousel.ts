"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

interface UseCarouselOptions {
  /** Auto-advance interval. Omit to disable autoplay. */
  autoplayMs?: number
}

/**
 * Small carousel state machine: index, next/prev, autoplay that pauses on
 * hover/focus and respects reduced-motion, plus touch-swipe handlers.
 * The autoplay timer restarts after every manual change.
 */
export function useCarousel(length: number, { autoplayMs }: UseCarouselOptions = {}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const next = useCallback(() => setIndex((i) => (length ? (i + 1) % length : 0)), [length])
  const prev = useCallback(() => setIndex((i) => (length ? (i - 1 + length) % length : 0)), [length])

  // Keep the index valid if the list shrinks (e.g. after a refetch).
  useEffect(() => {
    if (index >= length && length > 0) setIndex(0)
  }, [index, length])

  useEffect(() => {
    if (!autoplayMs || length < 2 || paused) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(next, autoplayMs)
    return () => window.clearInterval(id)
  }, [autoplayMs, length, paused, next, index])

  const bind = useMemo(
    () => ({
      onMouseEnter: () => setPaused(true),
      onMouseLeave: () => setPaused(false),
      onFocus: () => setPaused(true),
      onBlur: () => setPaused(false),
      onTouchStart: (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
      },
      onTouchEnd: (e: React.TouchEvent) => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        touchStartX.current = null
        if (Math.abs(dx) > 48) (dx < 0 ? next : prev)()
      },
    }),
    [next, prev]
  )

  return { index, setIndex, next, prev, bind }
}
