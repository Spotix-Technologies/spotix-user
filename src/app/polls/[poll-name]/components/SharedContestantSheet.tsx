"use client"

import { useEffect, useState } from "react"
import { X, Vote, Ban } from "lucide-react"
import type { ContestantData } from "@/app/lib/voting-utils"

interface SharedContestantSheetProps {
  contestant: ContestantData
  categoryName: string | null // null for single polls
  statsVisible: boolean
  /** True once voting is open (poll active, not suspended). */
  isActive: boolean
  /** Human-readable reason voting isn't currently open, e.g. "Voting hasn't started yet". */
  inactiveReason: string | null
  onVote: () => void
  onClose: () => void
}

export function SharedContestantSheet({
  contestant, categoryName, statsVisible, isActive, inactiveReason, onVote, onClose,
}: SharedContestantSheetProps) {
  // Mounts translated fully off-screen, then animates up on the next frame —
  // gives the slide-from-bottom effect instead of popping in.
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleClose = () => {
    setOpen(false)
    setTimeout(onClose, 250) // let the slide-down finish before unmounting
  }

  return (
    <div className="fixed inset-0 z-[1050] flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />
      <div
        className={`relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 sm:p-6 pb-8 transition-transform duration-300 ease-out
          ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
        <button onClick={handleClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>

        <p className="text-xs font-semibold text-[#6b2fa5] uppercase tracking-wide mb-3">You were invited to vote</p>

        <div className="flex items-center gap-4 mb-5">
          <img
            src={contestant.image || "/placeholder.svg"}
            alt={contestant.name}
            className="w-16 h-16 rounded-xl object-cover bg-slate-100 flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 truncate">{contestant.name}</p>
            {(categoryName || (statsVisible && typeof contestant.votes === "number")) && (
              <p className="text-sm text-slate-500">
                {categoryName ? `for ${categoryName}` : ""}
                {categoryName && statsVisible && typeof contestant.votes === "number" ? " · " : ""}
                {statsVisible && typeof contestant.votes === "number"
                  ? `${contestant.votes.toLocaleString()} vote${contestant.votes !== 1 ? "s" : ""}`
                  : ""}
              </p>
            )}
          </div>
        </div>

        {!isActive ? (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Ban className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">{inactiveReason || "Voting isn't open right now."}</p>
          </div>
        ) : (
          <button
            onClick={onVote}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] text-white font-semibold hover:shadow-lg transition-all"
          >
            <Vote className="w-4 h-4" />
            Vote for {contestant.name}
          </button>
        )}
      </div>
    </div>
  )
}
