"use client"

import { Clock3, Sparkles } from "lucide-react"

interface ComingSoonStateProps {
  pollName: string
}

/**
 * Shown instead of the normal contestant/category UI when a poll's
 * contestantsTBD flag is true — the organiser has set up the poll's
 * name/image/schedule but is waiting on an open-nomination poll to
 * close before adding real contestants. Mirrors the visual weight of
 * PendingState/FailedState (full-width replacement, not a small banner).
 */
export default function ComingSoonState({ pollName }: ComingSoonStateProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto py-12">
      <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-6">
        <Clock3 className="w-10 h-10 text-[#6b2fa5]" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-3">Voting Poll Coming Soon</h2>

      <p className="text-slate-600 leading-relaxed mb-2">
        <span className="font-semibold">{pollName}</span> is being set up — contestants haven't
        been added yet.
      </p>
      <p className="text-slate-500 text-sm leading-relaxed">
        Check back once the organiser finalises the lineup, or keep an eye on their nomination
        poll if one is open.
      </p>

      <div className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-50 text-[#6b2fa5] text-xs font-semibold">
        <Sparkles className="w-3.5 h-3.5" />
        Contestants to be announced
      </div>
    </div>
  )
}
