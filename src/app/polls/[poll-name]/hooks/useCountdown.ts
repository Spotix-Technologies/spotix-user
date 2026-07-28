"use client"

import { useEffect, useState } from "react"

export interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
  total: number
}

function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const total = targetDate.getTime() - Date.now()
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  }
}

/** Ticks every second toward `targetDate`. Pass null/undefined to pause. */
export function useCountdown(targetDate: Date | null): TimeRemaining {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0, hours: 0, minutes: 0, seconds: 0, total: 0,
  })

  useEffect(() => {
    if (!targetDate) return
    const update = () => setTimeRemaining(calculateTimeRemaining(targetDate))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return timeRemaining
}

export function fmt(n: number): string {
  return String(n).padStart(2, "0")
}
