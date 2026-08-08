"use client"

import { useMemo } from "react"
import { Ban, Scale, Zap, AlertTriangle } from "lucide-react"
import type { ScopeOutcome } from "@/app/lib/voting-helpers"
import { useCountdown, fmt } from "../hooks/useCountdown"

interface TieBreakerBannerProps {
  outcome: ScopeOutcome
  /** Contestant names by id, for a friendlier "X and Y are tied" line. */
  namesById: Record<string, string>
}

/**
 * Renders the right banner for a poll/category's post-end state:
 *   - no-votes         → nobody voted, no winner
 *   - tie-unresolved    → tied, but organiser never enabled a tie-breaker
 *   - tie-active         → a timed tie-breaker round is open, with a countdown
 *   - tie-fptp            → rounds exhausted, next vote among the tied wins —
 *                            still shown with a countdown for its own window
 *                            (same length as a round); it just silently
 *                            renews if nobody votes before it lapses
 * Renders nothing for "voting" / "not-started" / "winner" — those are
 * handled elsewhere (the countdown block, and the winner crown badge).
 */
export function TieBreakerBanner({ outcome, namesById }: TieBreakerBannerProps) {
  // Only derive the ISO string here — `new Date(...)` builds a fresh object
  // identity every render, and useCountdown's own tick re-renders this
  // component every second. Passing a fresh Date object straight into
  // useCountdown makes its effect see a "changed" dependency on every
  // single render (not just when the deadline itself changes), which
  // fires the effect immediately instead of once a second — an infinite,
  // zero-delay setState loop ("Maximum update depth exceeded"). Memoizing
  // on the primitive ISO string keeps the Date reference stable across
  // renders where the deadline hasn't actually moved.
  const endsAtIso =
    outcome.phase === "tie-active" ? outcome.endsAt :
    outcome.phase === "tie-fptp"   ? outcome.endsAt :
    null
  const endsAt = useMemo(() => (endsAtIso ? new Date(endsAtIso) : null), [endsAtIso])
  const timeRemaining = useCountdown(endsAt)

  if (outcome.phase === "no-votes") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl mb-4">
        <Ban className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <p className="text-sm text-slate-600 font-medium">No votes were cast — no winner here.</p>
      </div>
    )
  }

  if (outcome.phase === "tie-unresolved") {
    const names = outcome.contestantIds.map((id) => namesById[id] ?? id).join(" and ")
    return (
      <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <span className="font-semibold">It&apos;s a tie</span> between {names} — no tie-breaker was configured for
          this poll, so no winner has been crowned.
        </p>
      </div>
    )
  }

  if (outcome.phase === "tie-active") {
    const names = outcome.contestantIds.map((id) => namesById[id] ?? id).join(" and ")
    return (
      <div className="mb-4 rounded-2xl overflow-hidden border-2 border-[#6b2fa5]/30 bg-gradient-to-r from-[#6b2fa5]/10 to-purple-100/40">
        <div className="flex items-start gap-2.5 px-4 pt-3.5">
          <Scale className="w-5 h-5 text-[#6b2fa5] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#5a1f8a]">
              Tie-breaker round {outcome.round}{outcome.isFinalRound ? " (final round)" : ""} — vote now!
            </p>
            <p className="text-xs text-purple-700 mt-0.5">
              {names} are tied. Only they can receive votes until this round closes.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 px-4 pb-3.5 pt-3 max-w-md">
          {([
            ["D", timeRemaining.days],
            ["H", timeRemaining.hours],
            ["M", timeRemaining.minutes],
            ["S", timeRemaining.seconds],
          ] as [string, number][]).map(([lbl, val]) => (
            <div key={lbl} className="bg-white/70 rounded-lg py-2 text-center">
              <div className="text-lg font-bold text-[#6b2fa5] leading-none">{fmt(val)}</div>
              <div className="text-[10px] text-purple-500 font-semibold uppercase tracking-wide mt-1">{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (outcome.phase === "tie-fptp") {
    const names = outcome.contestantIds.map((id) => namesById[id] ?? id).join(" and ")
    return (
      <div className="mb-4 rounded-2xl overflow-hidden border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
        <div className="flex items-start gap-2.5 px-4 pt-3.5">
          <Zap className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-orange-800">First vote wins!</p>
            <p className="text-xs text-orange-700 mt-0.5">
              {names} are still tied after every tie-breaker round. Whoever gets the very next vote takes it —
              no waiting.
            </p>
          </div>
        </div>
        {outcome.endsAt && (
          <div className="grid grid-cols-4 gap-2 px-4 pb-3.5 pt-3 max-w-md">
            {([
              ["D", timeRemaining.days],
              ["H", timeRemaining.hours],
              ["M", timeRemaining.minutes],
              ["S", timeRemaining.seconds],
            ] as [string, number][]).map(([lbl, val]) => (
              <div key={lbl} className="bg-white/70 rounded-lg py-2 text-center">
                <div className="text-lg font-bold text-orange-600 leading-none">{fmt(val)}</div>
                <div className="text-[10px] text-orange-500 font-semibold uppercase tracking-wide mt-1">{lbl}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}
