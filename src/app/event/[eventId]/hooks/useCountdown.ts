"use client"

import { useEffect, useMemo, useState } from "react"

export type CountdownPhase = "upcoming" | "live" | "ended"

export interface CountdownState {
  /** false until mounted — avoids a server/client time mismatch */
  ready: boolean
  phase: CountdownPhase
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** Ticks once a second. `phase` flips upcoming → live → ended on its own. */
export function useCountdown(start: Date | null, end: Date | null): CountdownState {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const startMs = start?.getTime() ?? null
  const endMs = end?.getTime() ?? null

  return useMemo<CountdownState>(() => {
    if (now === null || startMs === null) {
      return { ready: false, phase: "upcoming", days: 0, hours: 0, minutes: 0, seconds: 0 }
    }
    if (now >= startMs) {
      const phase: CountdownPhase = endMs !== null && now >= endMs ? "ended" : "live"
      return { ready: true, phase, days: 0, hours: 0, minutes: 0, seconds: 0 }
    }
    const total = Math.floor((startMs - now) / 1000)
    return {
      ready: true,
      phase: "upcoming",
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    }
  }, [now, startMs, endMs])
}
