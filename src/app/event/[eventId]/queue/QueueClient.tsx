"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Users, Clock, ShieldCheck } from "lucide-react"
import {
  joinQueue,
  getQueueStatus,
  leaveQueue,
  queueTokenStorageKey,
  queueExpiryStorageKey,
  type QueueStatusResponse,
} from "@/app/lib/queue-client"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"

// Polled on a jittered cadence (not a fixed interval) so thousands of
// waiting clients don't all hit /queue/status in the same instant.
const POLL_INTERVAL_MS = 4000
const POLL_JITTER_MS = 800

export default function QueueClient() {
  const router = useRouter()
  const params = useParams<{ eventId: string }>()
  const searchParams = useSearchParams()
  const eventId = params?.eventId as string
  const guestSuffix = searchParams?.get("mode") === "guest" ? "?mode=guest" : ""

  const [status, setStatus] = useState<QueueStatusResponse | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  const tokenRef = useRef<string | null>(null)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mounted = useRef(true)

  const scheduleNextPoll = useCallback((fn: () => void) => {
    const delay = POLL_INTERVAL_MS + Math.random() * POLL_JITTER_MS
    pollTimer.current = setTimeout(fn, delay)
  }, [])

  const poll = useCallback(async () => {
    if (!eventId || !tokenRef.current) return
    const result = await getQueueStatus(eventId, tokenRef.current)
    if (!mounted.current) return

    if (!result || !result.success) {
      // Transient network hiccup — keep trying on the same cadence rather
      // than failing the whole wait over one dropped request.
      scheduleNextPoll(poll)
      return
    }

    setStatus(result)

    if (result.status === "admitted") {
      if (result.expiresAt) {
        sessionStorage.setItem(queueExpiryStorageKey(eventId), String(result.expiresAt))
      }
      router.push(`/event/${eventId}/payment${guestSuffix}`)
      return
    }

    if (result.status === "expired") {
      sessionStorage.removeItem(queueTokenStorageKey(eventId))
      setErrorMsg("Your place in line expired. Please try again.")
      return
    }

    scheduleNextPoll(poll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, router, guestSuffix, scheduleNextPoll])

  useEffect(() => {
    mounted.current = true
    if (!eventId) return

    const init = async () => {
      const storageKey = queueTokenStorageKey(eventId)
      let token = sessionStorage.getItem(storageKey)

      if (!token) {
        const joined = await joinQueue(eventId)
        if (!joined) {
          // Queue may have just been disabled, or the backend hiccuped —
          // either way, don't strand the buyer on an error screen. The
          // payment page still has their cart in sessionStorage.
          router.push(`/event/${eventId}/payment${guestSuffix}`)
          return
        }
        token = joined.queueToken
        sessionStorage.setItem(storageKey, token)
      }

      tokenRef.current = token
      poll()
    }

    init()

    const handleUnload = () => {
      if (tokenRef.current) leaveQueue(eventId, tokenRef.current)
    }
    window.addEventListener("pagehide", handleUnload)

    return () => {
      mounted.current = false
      if (pollTimer.current) clearTimeout(pollTimer.current)
      window.removeEventListener("pagehide", handleUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const totalWaiting = status?.totalWaiting ?? 0
  const position = status?.position ?? 0
  const progressPct = totalWaiting > 0 ? Math.max(4, 100 - (position / totalWaiting) * 100) : 8

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <UserHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          {errorMsg ? (
            <>
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Clock className="text-red-500" size={26} />
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-2">{errorMsg}</h1>
              <button
                onClick={() => router.push(`/event/${eventId}`)}
                className="mt-4 w-full bg-[#6b2fa5] text-white py-3 rounded-xl font-semibold hover:bg-purple-700 active:scale-[0.99] transition-all"
              >
                Back to event
              </button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                <Users className="text-[#6b2fa5]" size={26} />
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-1">You&apos;re in the queue</h1>
              <p className="text-sm text-gray-500 mb-6">
                Demand is high right now — hang tight and we&apos;ll let you through to checkout shortly.
              </p>

              <div className="bg-purple-50 rounded-xl p-5 mb-5">
                <p className="text-4xl font-extrabold text-[#6b2fa5]">
                  {status ? `#${position}` : "—"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalWaiting > 0 ? `of ${totalWaiting} waiting` : "your position in line"}
                </p>
              </div>

              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-5">
                <div
                  className="h-full bg-[#6b2fa5] transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
                <Clock size={15} className="text-gray-400" />
                <span>{status?.etaLabel || "Calculating your wait time…"}</span>
              </div>

              <p className="text-xs text-gray-400 mt-6 flex items-center justify-center gap-1.5">
                <ShieldCheck size={13} />
                Keep this tab open — you&apos;ll be moved to checkout automatically.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
