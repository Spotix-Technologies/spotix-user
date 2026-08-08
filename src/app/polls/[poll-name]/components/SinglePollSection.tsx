import type { ContestantData, PollStatus } from "@/app/lib/voting-utils"
import type { ScopeOutcome } from "@/app/lib/voting-helpers"
import { isContestantVotable } from "@/app/lib/voting-helpers"
import { ContestantCard } from "./ContestantCard"
import { TieBreakerBanner } from "./TieBreakerBanner"

interface SinglePollSectionProps {
  contestants: ContestantData[]
  isActive: boolean
  pollStatus: PollStatus
  statsVisible: boolean
  totalVotes: number
  /** Outcome for the whole poll (scopeKey "single") — winner, no-votes, or a tie-breaker phase. */
  outcome: ScopeOutcome
  namesById: Record<string, string>
  pollName: string
  onVoteClick: (c: ContestantData) => void
  onFullscreen: (c: ContestantData) => void
}

export function SinglePollSection({
  contestants, isActive, pollStatus, statsVisible, totalVotes, outcome, namesById, pollName, onVoteClick, onFullscreen,
}: SinglePollSectionProps) {
  const tieBreakerLive = outcome.phase === "tie-active" || outcome.phase === "tie-fptp"

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          {tieBreakerLive ? "Tie-Breaker!" : pollStatus === "ended" ? "Final Results" : "Cast Your Vote"}
        </h2>
        <p className="text-slate-600">
          {tieBreakerLive
            ? "It's a tie — vote below to help settle it."
            : isActive
            ? "Pick a contestant and choose how many votes to cast"
            : pollStatus === "notStarted"
            ? "Voting hasn't started yet"
            : "Final standings"}
        </p>
      </div>

      {pollStatus === "ended" && <TieBreakerBanner outcome={outcome} namesById={namesById} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contestants.map((c) => (
          <ContestantCard
            key={c.contestantId}
            contestant={c}
            isWinner={outcome.phase === "winner" && outcome.winnerId === c.contestantId}
            isVotable={isContestantVotable(outcome, c.contestantId)}
            isTieBreakerContestant={tieBreakerLive && outcome.contestantIds.includes(c.contestantId)}
            pollStatus={pollStatus}
            statsVisible={statsVisible}
            totalVotes={totalVotes}
            pollName={pollName}
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
