import { Flag, Users } from "lucide-react"
import type { VoteData, PollStatus } from "@/app/lib/voting-utils"

interface PollHeaderCardProps {
  pollData: VoteData
  pollStatus: PollStatus
  suspended: boolean
  isActive: boolean
  isGroup: boolean
  onReport: () => void
}

export function PollHeaderCard({ pollData, pollStatus, suspended, isActive, isGroup, onReport }: PollHeaderCardProps) {
  return (
    <div className="mb-8">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl">
        <div className="mb-6 h-48 sm:h-64 rounded-xl overflow-hidden bg-slate-100">
          <img src={pollData.pollImage || "/placeholder.svg"} alt={pollData.pollName}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">{pollData.pollName}</h1>
        <p className="text-slate-600 mb-6 leading-relaxed">{pollData.pollDescription}</p>

        <div className="flex flex-wrap items-center gap-3">
          <span className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2
            ${suspended              ? "bg-red-600 text-white"
            : isActive               ? "bg-green-500 text-white animate-pulse"
            : pollStatus === "ended" ? "bg-red-500 text-white"
            : "bg-yellow-500 text-white"}`}>
            <div className="w-2 h-2 rounded-full bg-white opacity-80" />
            {suspended ? "Suspended" : pollStatus === "active" ? "Live" : pollStatus === "ended" ? "Ended" : "Upcoming"}
          </span>

          {isGroup ? (
            <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Group Poll
            </span>
          ) : (
            !suspended && (
              <span className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold">
                {pollData.pollPrice > 0 ? `₦${pollData.pollPrice.toLocaleString()} per vote` : "Free Vote"}
              </span>
            )
          )}

          <button onClick={onReport}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full border border-slate-200 hover:border-red-200 transition-all">
            <Flag className="w-3 h-3" /> Report Poll
          </button>
        </div>
      </div>
    </div>
  )
}
