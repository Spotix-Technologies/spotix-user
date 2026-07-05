"use client"

import { Crown, Maximize2 } from "lucide-react"
import type { ContestantData } from "@/app/lib/voting-utils"

interface ContestantCardProps {
  contestant: ContestantData
  isWinner: boolean
  isActive: boolean
  pollStatus: "active" | "ended" | "notStarted"
  statsVisible: boolean
  totalVotes: number
  onVoteClick: (c: ContestantData) => void
  onFullscreen: (c: ContestantData) => void
}

export function ContestantCard({
  contestant,
  isWinner,
  isActive,
  pollStatus,
  statsVisible,
  totalVotes,
  onVoteClick,
  onFullscreen,
}: ContestantCardProps) {
  const votes = contestant.votes ?? 0
  const pct   = totalVotes > 0 && statsVisible ? Math.round((votes / totalVotes) * 100) : 0

  return (
    <div
      className={`rounded-2xl overflow-hidden border-2 transition-all duration-300 hover:scale-[1.02] bg-white/80 hover:shadow-xl
        ${isWinner ? "border-yellow-400 shadow-yellow-100" : "border-slate-200 hover:border-slate-300"}`}
    >
      <div className="relative h-56 overflow-hidden bg-slate-100">
        <img
          src={contestant.image || "/placeholder.svg"}
          alt={contestant.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        {isWinner && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-2 rounded-full shadow-lg flex items-center gap-2">
            <Crown className="w-4 h-4" />
            <span className="text-xs font-bold">Winner</span>
          </div>
        )}
        <button
          onClick={() => onFullscreen(contestant)}
          className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">{contestant.name}</h3>
        <p className="text-xs text-slate-500 mb-4 font-mono bg-slate-50 px-2 py-1 rounded">
          {contestant.contestantId}
        </p>

        {/* Stats — only show if statsVisible */}
        {statsVisible && pollStatus === "ended" && (
          <div className="mb-4 p-3 bg-[#6b2fa5]/10 rounded-lg">
            <p className="text-xs text-slate-500 font-medium mb-0.5">Total Votes</p>
            <p className="text-2xl font-bold text-[#6b2fa5]">{votes.toLocaleString()}</p>
          </div>
        )}

        {/* Live progress bar when poll is active and stats are visible */}
        {statsVisible && isActive && totalVotes > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{votes.toLocaleString()} votes</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <button
          onClick={() => onVoteClick(contestant)}
          disabled={!isActive}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2
            ${isActive
              ? "bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] text-white hover:shadow-lg active:scale-95"
              : "bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"}`}
        >
          {isActive ? "Vote Now" : pollStatus === "notStarted" ? "Coming Soon" : "Voting Ended"}
        </button>
      </div>
    </div>
  )
}
