// app/event/[eventId]/payment/hooks/useQueueCheckoutWindow.ts
"use client"

import { useEffect, useState } from "react"
import {
  getQueueStatus,
  queueTokenStorageKey,
  queueExpiryStorageKey,
} from "@/app/lib/queue-client"
import { readQueueSession } from "../lib/checkout-storage"

/**
 * Queue checkout-window countdown — only populated when this buyer came
 * through /event/[eventId]/queue and has a token+expiry stored for this
 * event. secondsLeft ticks down locally every second; a periodic server
 * check (below) is the actual source of truth, since the local clock can
 * drift and the admin can change the wait time or evict the slot early.
 */
export function useQueueCheckoutWindow(eventId: string | undefined) {
  const [queueDeadline, setQueueDeadline] = useState<number | null>(null)
  const [queueSecondsLeft, setQueueSecondsLeft] = useState<number | null>(null)
  const [queueExpired, setQueueExpired] = useState(false)

  useEffect(() => {
    if (!eventId) return

    const session = readQueueSession(eventId, queueTokenStorageKey(eventId), queueExpiryStorageKey(eventId))
    if (!session) return

    setQueueDeadline(session.expiry)

    const tick = setInterval(() => {
      setQueueDeadline((deadline) => {
        if (deadline === null) return deadline
        const left = deadline - Math.floor(Date.now() / 1000)
        setQueueSecondsLeft(left)
        if (left <= 0) setQueueExpired(true)
        return deadline
      })
    }, 1000)

    const revalidate = async () => {
      const result = await getQueueStatus(eventId, session.token)
      if (!result || !result.success) return // transient network hiccup — trust the local timer for now

      if (result.status === "expired") {
        setQueueExpired(true)
        return
      }
      if (result.status === "admitted" && result.expiresAt) {
        sessionStorage.setItem(queueExpiryStorageKey(eventId), String(result.expiresAt))
        setQueueDeadline(result.expiresAt)
      }
    }

    revalidate()
    const revalidateTimer = setInterval(revalidate, 20000)

    return () => {
      clearInterval(tick)
      clearInterval(revalidateTimer)
    }
  }, [eventId])

  return { queueDeadline, queueSecondsLeft, queueExpired }
}
