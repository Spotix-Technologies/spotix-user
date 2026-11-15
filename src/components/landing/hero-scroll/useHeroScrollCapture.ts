"use client"

/**
 * useHeroScrollCapture — drives the hero's 0→1 expansion progress from wheel / touch /
 * keyboard / hint-button input, and keeps the page locked until the split animation has
 * fully finished.
 *
 * Page scrolling is blocked on every channel while the hero is closed or settling:
 *  - wheel + touch are captured and prevented
 *  - keyboard scroll keys expand the hero instead of scrolling
 *  - scrollbar drag / autoscroll / native jumps are stopped by an overflow lock on <html>
 *  - #anchor clicks finish the hero first, then scroll to their section
 *  - the preloader (data-hero-hold) freezes input so the hero can't advance behind it
 * Scrolling is released only after the final frame is painted and the gesture that
 * completed the expansion has ended.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { getLenis, setLenisLocked } from "../useLenis"
import { setHeroProgress } from "./hero-progress"
import {
  COLLAPSE_NUDGE,
  COLLAPSE_TOP_THRESHOLD,
  EXPAND_KEYS,
  HOLD_SELECTOR,
  MODAL_SELECTOR,
  NAV_OFFSET,
  SETTLE_MS,
  TOUCH_COLLAPSE_THRESHOLD,
  TOUCH_SENSITIVITY_BACK,
  TOUCH_SENSITIVITY_UP,
  WHEEL_IDLE_MS,
  WHEEL_SENSITIVITY,
} from "./constants"

const isHeld = () => document.querySelector(HOLD_SELECTOR) !== null
const isModalOpen = () => document.querySelector(MODAL_SELECTOR) !== null

function scrollToAnchor(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const lenis = getLenis()
  if (lenis) lenis.scrollTo(el, { offset: -NAV_OFFSET })
  else el.scrollIntoView({ behavior: "smooth", block: "start" })
  window.history.replaceState(null, "", `#${id}`)
}

export function useHeroScrollCapture(disabled: boolean) {
  const [progress, setProgress] = useState(0)
  const [expanded, setExpanded] = useState(false)

  // Mirrors of state so the (single) event listeners never go stale
  const progressRef = useRef(0)
  const expandedRef = useRef(false)
  /** true from the moment the hero completes until scrolling is actually released */
  const gateRef = useRef(false)
  const touchYRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const settleRef = useRef<number | null>(null)
  const lastWheelRef = useRef(0)
  const pendingAnchorRef = useRef<string | null>(null)
  const initRef = useRef(false)

  const clearSettle = useCallback(() => {
    if (settleRef.current !== null) {
      clearTimeout(settleRef.current)
      settleRef.current = null
    }
  }, [])

  const cancelAnim = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  /** Release the page lock once the final frame is painted and any wheel inertia has died down. */
  const scheduleUnlock = useCallback(() => {
    clearSettle()
    const check = () => {
      if (performance.now() - lastWheelRef.current < WHEEL_IDLE_MS) {
        settleRef.current = window.setTimeout(check, 50)
        return
      }
      settleRef.current = null
      gateRef.current = false
      setLenisLocked(false)
      const anchor = pendingAnchorRef.current
      if (anchor) {
        pendingAnchorRef.current = null
        scrollToAnchor(anchor)
      }
    }
    settleRef.current = window.setTimeout(check, SETTLE_MS)
  }, [clearSettle])

  const markExpanded = useCallback(
    (value: boolean) => {
      expandedRef.current = value
      setExpanded(value)
      if (value) {
        gateRef.current = true
        setLenisLocked(true) // stays locked until scheduleUnlock fires
        scheduleUnlock()
      } else {
        clearSettle()
        gateRef.current = false
        pendingAnchorRef.current = null
        setLenisLocked(true)
      }
    },
    [clearSettle, scheduleUnlock],
  )

  const apply = useCallback(
    (raw: number) => {
      const next = Math.min(Math.max(raw, 0), 1)
      progressRef.current = next
      setProgress(next)
      setHeroProgress(next) // lets the navbar switch from transparent to white
      if (next >= 1 && !expandedRef.current) markExpanded(true)
    },
    [markExpanded],
  )

  const animateTo = useCallback(
    (target: number) => {
      cancelAnim()
      const from = progressRef.current
      const startedAt = performance.now()
      const duration = 250 + 750 * Math.abs(target - from)

      const tick = (now: number) => {
        const t = Math.min(1, (now - startedAt) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        apply(from + (target - from) * eased)
        rafRef.current = t < 1 ? requestAnimationFrame(tick) : null
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [apply, cancelAnim],
  )

  const collapse = useCallback(() => {
    cancelAnim()
    markExpanded(false)
    apply(COLLAPSE_NUDGE)
  }, [apply, cancelAnim, markExpanded])

  // The hero always (re)starts closed on mount, so don't leak progress across navigations
  useEffect(() => {
    setHeroProgress(0)
    return () => setHeroProgress(0)
  }, [])

  useEffect(() => {
    if (disabled) {
      setLenisLocked(false)
      return
    }

    // Always start a visit at the top so the hero plays; a #hash deep link skips it instead.
    const prevRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    if (!initRef.current) {
      initRef.current = true
      if (window.location.hash && window.scrollY > 0) apply(1)
      else window.scrollTo(0, 0)
    }
    if (!expandedRef.current) setLenisLocked(true)

    const onWheel = (e: WheelEvent) => {
      lastWheelRef.current = performance.now()
      const stop = () => e.cancelable && e.preventDefault()

      if (isHeld()) return stop() // preloader: hero must not advance behind it
      if (isModalOpen()) return
      if (gateRef.current) return stop() // expansion finishing — swallow the gesture

      if (expandedRef.current) {
        // Scrolling up from the very top collapses the hero again
        if (e.deltaY < 0 && window.scrollY <= COLLAPSE_TOP_THRESHOLD) {
          stop()
          collapse()
        }
        return
      }
      stop()
      cancelAnim()
      apply(progressRef.current + e.deltaY * WHEEL_SENSITIVITY)
    }

    const onTouchStart = (e: TouchEvent) => {
      touchYRef.current = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      const startY = touchYRef.current
      if (startY === null) return
      const stop = () => e.cancelable && e.preventDefault()

      if (isHeld()) return stop()
      if (isModalOpen()) return

      const y = e.touches[0].clientY
      const deltaY = startY - y

      if (gateRef.current) {
        touchYRef.current = y
        return stop()
      }

      if (expandedRef.current) {
        if (deltaY < -TOUCH_COLLAPSE_THRESHOLD && window.scrollY <= COLLAPSE_TOP_THRESHOLD) {
          touchYRef.current = y
          stop()
          collapse()
        }
        return
      }

      stop()
      cancelAnim()
      const factor = deltaY < 0 ? TOUCH_SENSITIVITY_BACK : TOUCH_SENSITIVITY_UP
      apply(progressRef.current + deltaY * factor)
      touchYRef.current = y
    }

    const onTouchEnd = () => {
      touchYRef.current = null
    }

    // Safety net only — the overflow lock should already make this unreachable.
    // Never "helpfully" expands: a stray scroll just snaps back to the top.
    const onScroll = () => {
      if (!expandedRef.current && window.scrollY !== 0) window.scrollTo(0, 0)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen() || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(el.tagName))) return
      if (!EXPAND_KEYS.includes(e.key)) return
      if (isHeld() || gateRef.current) {
        e.preventDefault()
        return
      }
      if (!expandedRef.current) {
        e.preventDefault()
        animateTo(1)
      }
    }

    // #anchor links (navbar): finish the hero first, then glide to the section
    const onClick = (e: MouseEvent) => {
      if (expandedRef.current && !gateRef.current) return
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]')
      const id = link?.getAttribute("href")?.slice(1)
      if (!id) return
      e.preventDefault()
      pendingAnchorRef.current = id
      if (!expandedRef.current) animateTo(1)
    }

    window.addEventListener("wheel", onWheel, { passive: false })
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchmove", onTouchMove, { passive: false })
    window.addEventListener("touchend", onTouchEnd)
    window.addEventListener("scroll", onScroll)
    window.addEventListener("keydown", onKeyDown)
    document.addEventListener("click", onClick, true)

    return () => {
      window.removeEventListener("wheel", onWheel)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("click", onClick, true)
      cancelAnim()
      clearSettle()
      window.history.scrollRestoration = prevRestoration
      setLenisLocked(false)
    }
  }, [disabled, apply, animateTo, cancelAnim, clearSettle, collapse])

  return { progress, expanded, animateTo }
}
