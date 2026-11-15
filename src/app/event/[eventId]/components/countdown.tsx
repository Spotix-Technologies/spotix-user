"use client"

import { useCountdown } from "../hooks/useCountdown"

interface CountdownProps {
  start: Date | null
  end: Date | null
}

const pad = (n: number) => String(n).padStart(2, "0")

/** Live days/hours/minutes/seconds to the start. Swaps to "Happening now" / "Event ended" automatically. */
export function Countdown({ start, end }: CountdownProps) {
  const c = useCountdown(start, end)

  if (!start) return null

  const pill = "inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-md"

  if (c.ready && c.phase === "live") {
    return (
      <div className={`${pill} border-emerald-300/30 bg-emerald-400/15 text-emerald-200`}>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </span>
        Happening now
      </div>
    )
  }

  if (c.ready && c.phase === "ended") {
    return <div className={`${pill} border-white/15 bg-white/10 text-white/70`}>This event has ended</div>
  }

  const units = [
    { label: "Days", value: c.days, accent: true },
    { label: "Hours", value: c.hours },
    { label: "Minutes", value: c.minutes },
    { label: "Seconds", value: c.seconds },
  ]

  return (
    <div
      role="timer"
      aria-label="Time until the event starts"
      className="inline-flex items-start gap-4 rounded-3xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-md sm:gap-7 sm:px-7"
    >
      {units.map((u, i) => (
        <div key={u.label} className="flex items-start gap-4 sm:gap-7">
          <div className="min-w-[2.6rem] text-center sm:min-w-[3.4rem]">
            <p
              className={`text-4xl font-bold tabular-nums leading-none sm:text-5xl ${
                u.accent ? "text-[#c9a2ff]" : "text-white"
              }`}
            >
              {c.ready ? pad(u.value) : "--"}
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50 sm:text-xs">{u.label}</p>
          </div>
          {i < units.length - 1 && (
            <span aria-hidden="true" className="mt-3 hidden flex-col gap-2 sm:flex">
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span className="h-1 w-1 rounded-full bg-white/30" />
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
