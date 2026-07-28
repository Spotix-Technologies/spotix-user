import type { TimeRemaining } from "../hooks/useCountdown"
import { fmt } from "../hooks/useCountdown"

interface CountdownBlockProps {
  label: "Voting Starts In" | "Voting Ends In"
  timeRemaining: TimeRemaining
}

export function CountdownBlock({ label, timeRemaining }: CountdownBlockProps) {
  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] rounded-2xl p-6 sm:p-8 shadow-2xl">
        <h2 className="text-white text-xl font-bold text-center mb-6">{label}</h2>
        <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-2xl mx-auto">
          {([
            ["Days", timeRemaining.days],
            ["Hours", timeRemaining.hours],
            ["Minutes", timeRemaining.minutes],
            ["Seconds", timeRemaining.seconds],
          ] as [string, number][]).map(([lbl, val]) => (
            <div key={lbl} className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 text-center">
              <div className="text-3xl sm:text-5xl font-bold text-white mb-2">{fmt(val)}</div>
              <div className="text-xs sm:text-sm text-white/80 font-semibold uppercase tracking-wider">{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
