import type { ContestantData, PollStatus } from "@/app/lib/voting-utils"
import { ContestantCard } from "./ContestantCard"

interface SinglePollSectionProps {
  contestants: ContestantData[]
  isActive: boolean
  pollStatus: PollStatus
  statsVisible: boolean
  totalVotes: number
  winnerId: string | null
  onVoteClick: (c: ContestantData) => void
  onFullscreen: (c: ContestantData) => void
}

export function SinglePollSection({
  contestants, isActive, pollStatus, statsVisible, totalVotes, winnerId, onVoteClick, onFullscreen,
}: SinglePollSectionProps) {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          {pollStatus === "ended" ? "Final Results" : "Cast Your Vote"}
        </h2>
        <p className="text-slate-600">
          {isActive ? "Pick a contestant and choose how many votes to cast"
          : pollStatus === "notStarted" ? "Voting hasn't started yet"
          : "Final standings"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contestants.map((c) => (
          <ContestantCard
            key={c.contestantId}
            contestant={c}
            isWinner={pollStatus === "ended" && winnerId === c.contestantId}
            isActive={isActive}
            pollStatus={pollStatus}
            statsVisible={statsVisible}
            totalVotes={totalVotes}
            onVoteClick={onVoteClick}
            onFullscreen={onFullscreen}
          />
        ))}
      </div>

      {contestants.length === 0 && (
        <div className="text-center py-16 bg-white/50 rounded-2xl border-2 border-dashed border-slate-300">
          <p className="text-slate-500 font-medium">No contestants added yet</p>
        </div>
      )}
    </>
  )
}
