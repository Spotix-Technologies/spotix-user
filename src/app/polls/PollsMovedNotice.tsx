"use client"

import { useEffect, useState } from "react"

interface Props {
  /** Full URL on Spotix Polls to send the user to. Empty/undefined if SPOTIX_POLLS_URL isn't configured. */
  redirectUrl?: string
  /** Optional poll name to personalize the message. */
  pollName?: string
  /** How many seconds to show the message before auto-redirecting. */
  delaySeconds?: number
}

export default function PollsMovedNotice({ redirectUrl, pollName, delaySeconds = 4 }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(delaySeconds)

  useEffect(() => {
    if (!redirectUrl) return // nothing to redirect to — SPOTIX_POLLS_URL not configured

    if (secondsLeft <= 0) {
      window.location.href = redirectUrl
      return
    }

    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, redirectUrl])

  return (
    <div className="flex-1 flex items-center justify-center max-w-xl mx-auto w-full px-4 py-16">
      <div className="text-center bg-white rounded-2xl shadow-sm border border-slate-100 p-8 sm:p-10 w-full">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-[#6b2fa5]/10 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-[#6b2fa5]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {pollName ? `“${pollName}” has moved` : "Polls & Nominations have moved"}
        </h1>

        <p className="text-slate-600 mb-1">
          Polls and Nominations are now on{" "}
          <span className="font-semibold text-[#6b2fa5]">Spotix Polls</span>.
        </p>

        {redirectUrl ? (
          <p className="text-slate-500 text-sm mb-6">
            Don&apos;t worry, we will automatically redirect you to this poll on Spotix Polls
            {secondsLeft > 0 ? ` in ${secondsLeft}s…` : "…"}
          </p>
        ) : (
          <p className="text-slate-500 text-sm mb-6">
            Head over to Spotix Polls to continue.
          </p>
        )}

        {redirectUrl && (
          <a
            href={redirectUrl}
            className="inline-block px-6 py-2 bg-[#6b2fa5] text-white rounded-lg font-semibold hover:bg-[#5a1f8a] transition-colors"
          >
            Take me there now
          </a>
        )}
      </div>
    </div>
  )
}
