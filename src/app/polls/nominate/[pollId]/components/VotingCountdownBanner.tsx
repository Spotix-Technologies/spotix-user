"use client"

import { useMemo } from "react"
import Link from "next/link"
import { PartyPopper } from "lucide-react"
import { useCountdown } from "@/app/polls/[poll-name]/hooks/useCountdown"
import { CountdownBlock } from "@/app/polls/[poll-name]/components/CountdownBlock"

interface VotingCountdownBannerProps {
  votingStartsAt: string
  linkedVotingPollId: string | null
  linkedVotingPollName: string | null
}

/**
 * "Real Voting Starts In" countdown, shown on the nomination page once
 * the organiser links a voting poll from /polls/nominations/[pollId]/settings.
 * Reuses the exact same countdown hook/UI as the voting-poll page itself
 * (@/app/polls/[poll-name]) instead of duplicating it.
 */
export function VotingCountdownBanner({
  votingStartsAt, linkedVotingPollId, linkedVotingPollName,
}: VotingCountdownBannerProps) {
  // useCountdown's effect depends on this Date object BY REFERENCE
  // ([targetDate] in its dependency array) — `new Date(...)` inline on
  // every render would give a new reference each time even though the
  // value is identical, re-firing the effect every render and looping
  // forever. Memoizing on the underlying string keeps the reference
  // stable across re-renders (mirrors the same pattern in pollClient.tsx).
  const targetDate = useMemo(() => new Date(votingStartsAt), [votingStartsAt])
  const timeRemaining = useCountdown(targetDate)
  const hasStarted = timeRemaining.total <= 0

  if (hasStarted) {
    if (!linkedVotingPollId) return null
    return (
      <div className="mb-6">
        <Link
          href={`/polls/${linkedVotingPollId}`}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] rounded-2xl p-5 shadow-xl text-white font-semibold hover:opacity-95 transition-opacity"
        >
          <PartyPopper className="w-5 h-5" />
          Real voting for {linkedVotingPollName || "this poll"} is live now — vote here →
        </Link>
      </div>
    )
  }

  return <CountdownBlock label="Real Voting Starts In" timeRemaining={timeRemaining} />
}
