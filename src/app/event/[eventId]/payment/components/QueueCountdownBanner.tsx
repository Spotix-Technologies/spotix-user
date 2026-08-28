"use client"

import { ShieldCheck } from "lucide-react"
import { formatCountdown } from "@/app/lib/queue-client"
import { BRAND_PURPLE } from "../constants"

interface QueueCountdownBannerProps {
  queueSecondsLeft: number
}

export default function QueueCountdownBanner({ queueSecondsLeft }: QueueCountdownBannerProps) {
  return (
    <div
      className={`mb-6 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold ${
        queueSecondsLeft <= 60
          ? "bg-red-50 text-red-700 border border-red-200"
          : "bg-purple-50 border border-purple-200"
      }`}
      style={queueSecondsLeft <= 60 ? undefined : { color: BRAND_PURPLE }}
    >
      <ShieldCheck size={16} />
      Complete checkout within {formatCountdown(queueSecondsLeft)} to keep your spot
    </div>
  )
}
