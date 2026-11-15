"use client"

/**
 * hero-progress.ts — tiny shared store that lets the navbar know the hero has started.
 *
 * The hero locks page scrolling while it expands, so `window.scrollY` stays at 0 during the
 * user's first scroll. The navbar therefore can't rely on scroll position alone; the hero
 * publishes its 0→1 progress here and the navbar subscribes to "has it left 0?".
 */

import { useSyncExternalStore } from "react"

let progress = 0
const listeners = new Set<() => void>()

/** Called by useHeroScrollCapture on every progress change. */
export function setHeroProgress(value: number): void {
  if (value === progress) return
  progress = value
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * true as soon as the user has made the first scroll input (progress > 0).
 * Subscribes to a boolean, so the navbar re-renders once per toggle — not once per frame.
 */
export function useHeroStarted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => progress > 0,
    () => false,
  )
}
