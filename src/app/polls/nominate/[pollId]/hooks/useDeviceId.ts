"use client"

import { useEffect, useState } from "react"

const DEVICE_ID_KEY = "spotix_nominate_device_id"

function generateUUID(): string {
  // crypto.randomUUID is only available in secure contexts (https or
  // localhost) — falls back to Math.random on plain-http/LAN access.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Stable per-browser id used to rate-limit one nomination per category. */
export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
      id = generateUUID()
      localStorage.setItem(DEVICE_ID_KEY, id)
    }
    setDeviceId(id)
  }, [])

  return deviceId
}

/** Has this browser already nominated in this category? (UI hint only —
 *  the server is the real source of truth via device+IP checks.) */
export function hasNominatedLocally(pollId: string, categoryId: string): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(`spotix_nominated_${pollId}_${categoryId}`) === "true"
}

export function markNominatedLocally(pollId: string, categoryId: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(`spotix_nominated_${pollId}_${categoryId}`, "true")
}
