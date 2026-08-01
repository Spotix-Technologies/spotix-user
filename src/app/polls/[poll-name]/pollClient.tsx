"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { getPollStatus } from "@/app/lib/voting-helpers"
import type { VoteData, ContestantData, CategoryData } from "@/app/lib/voting-utils"
import { FullscreenModal } from "./components/FullscreenModal"
import { VoteModal } from "./components/VoteModal"
import { ReportPollModal } from "./components/ReportPollModal"
import { SuspendedBanner } from "./components/SuspendedBanner"
import ComingSoonState from "./components/ComingSoonState"
import { PollHeaderCard } from "./components/PollHeaderCard"
import { CountdownBlock } from "./components/CountdownBlock"
import { GroupPollSection } from "./components/GroupPollSection"
import { SinglePollSection } from "./components/SinglePollSection"
import { useCountdown } from "./hooks/useCountdown"

interface PollClientProps {
  pollData: VoteData
  voteId: string
  userId?: string | null
}

export default function PollClient({ pollData, voteId, userId }: PollClientProps) {
  const [selectedContestant, setSelectedContestant] = useState<ContestantData | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null)
  const [fullscreenContestant, setFullscreenContestant] = useState<ContestantData | null>(null)
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  const pollType = pollData.pollType ?? "single"
  const isGroup = pollType === "group"
  const statsVisible = pollData.statsVisible ?? true
  const suspended = pollData.suspended ?? false
  const contestantsTBD = pollData.contestantsTBD ?? false

  const pollStatus = useMemo(
    () => getPollStatus(pollData.pollStartDate, pollData.pollStartTime, pollData.pollEndDate, pollData.pollEndTime),
    [pollData.pollStartDate, pollData.pollStartTime, pollData.pollEndDate, pollData.pollEndTime],
  )

  const targetDate = useMemo(() => {
    if (pollStatus === "notStarted") return new Date(`${pollData.pollStartDate}T${pollData.pollStartTime}`)
    if (pollStatus === "active") return new Date(`${pollData.pollEndDate}T${pollData.pollEndTime}`)
    return null
  }, [pollStatus, pollData])

  const timeRemaining = useCountdown(targetDate)

  const contestants = pollData.contestants ?? []
  const categories = pollData.categories ?? []
  const isActive = pollStatus === "active" && !suspended

  const winner = useMemo(() => {
    if (pollStatus !== "ended" || contestants.length === 0) return null
    return contestants.reduce((h, c) => ((c.votes ?? 0) > (h.votes ?? 0) ? c : h), contestants[0])
  }, [contestants, pollStatus])

  const totalVotesSingle = contestants.reduce((s, c) => s + (c.votes ?? 0), 0)

  const handleVoteClick = (c: ContestantData, cat?: CategoryData) => {
    if (!isActive) return
    setSelectedContestant(c)
    setSelectedCategory(cat ?? null)
    setShowVoteModal(true)
  }

  return (
    <>
      {/* Back */}
      <div className="mb-6">
        <Link href="/vote" className="inline-flex items-center text-[#6b2fa5] hover:text-[#5a1f8a] font-medium transition-colors group">
          <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Polls
        </Link>
      </div>

      {suspended && <SuspendedBanner />}

      <PollHeaderCard
        pollData={pollData}
        pollStatus={pollStatus}
        suspended={suspended}
        isActive={isActive}
        isGroup={isGroup}
        onReport={() => setShowReportModal(true)}
      />

      {pollStatus !== "ended" && targetDate && !suspended && !contestantsTBD && (
        <CountdownBlock
          label={pollStatus === "notStarted" ? "Voting Starts In" : "Voting Ends In"}
          timeRemaining={timeRemaining}
        />
      )}

      {pollStatus === "ended" && !contestantsTBD && (
        <div className="mb-8 p-6 rounded-2xl bg-red-50 border-l-4 border-red-500">
          <p className="font-bold text-red-900">This poll has ended</p>
          <p className="text-red-700 text-sm mt-1">Voting is no longer available</p>
        </div>
      )}

      {contestantsTBD ? (
        <ComingSoonState pollName={pollData.pollName} />
      ) : isGroup ? (
        <GroupPollSection
          categories={categories}
          isActive={isActive}
          pollStatus={pollStatus}
          statsVisible={statsVisible}
          onVote={handleVoteClick}
          onFullscreen={setFullscreenContestant}
        />
      ) : (
        <SinglePollSection
          contestants={contestants}
          isActive={isActive}
          pollStatus={pollStatus}
          statsVisible={statsVisible}
          totalVotes={totalVotesSingle}
          winnerId={winner?.contestantId ?? null}
          onVoteClick={handleVoteClick}
          onFullscreen={setFullscreenContestant}
        />
      )}

      {/* Modals */}
      <FullscreenModal contestant={fullscreenContestant} onClose={() => setFullscreenContestant(null)} />

      {showVoteModal && selectedContestant && (
        <VoteModal
          contestant={selectedContestant}
          pollData={pollData}
          voteId={voteId}
          userId={userId}
          categoryId={selectedCategory?.categoryId}
          categoryPrice={selectedCategory?.pollPrice}
          onClose={() => { setShowVoteModal(false); setSelectedContestant(null); setSelectedCategory(null) }}
        />
      )}

      {showReportModal && (
        <ReportPollModal
          pollId={voteId}
          pollName={pollData.pollName}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  )
}
