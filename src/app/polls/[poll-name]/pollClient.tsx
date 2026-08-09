"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { getPollStatus, findContestantInPoll, resolveScopeOutcome, buildLeafOutcomes, isContestantVotable } from "@/app/lib/voting-helpers"
import type { VoteData, ContestantData, CategoryData } from "@/app/lib/voting-utils"
import { FullscreenModal } from "./components/FullscreenModal"
import { VoteModal } from "./components/VoteModal"
import { ReportPollModal } from "./components/ReportPollModal"
import { CheckVotePaymentModal } from "./components/CheckVotePaymentModal"
import { SharedContestantSheet } from "./components/SharedContestantSheet"
import { SearchBar, type SearchableContestant } from "./components/SearchBar"
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
  const searchParams = useSearchParams()
  const router = useRouter()

  const [selectedContestant, setSelectedContestant] = useState<ContestantData | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null)
  const [fullscreenContestant, setFullscreenContestant] = useState<ContestantData | null>(null)
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showCheckPaymentModal, setShowCheckPaymentModal] = useState(false)

  // Shared-link deep dive: ?contestant=<contestantId> — resolved straight
  // against the already-loaded pollData, no extra fetch needed.
  const sharedContestantId = searchParams.get("contestant")
  const [sheetDismissed, setSheetDismissed] = useState(false)

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

  const tieBreakerEnabled = pollData.enabledTieBreaker ?? false

  // Single-poll outcome (winner / no-votes / tie phases). For group polls,
  // one outcome is computed per LEAF category instead — see below.
  const singleOutcome = useMemo(
    () => resolveScopeOutcome(contestants, pollStatus, pollData.tieBreakers?.["single"], tieBreakerEnabled),
    [contestants, pollStatus, pollData.tieBreakers, tieBreakerEnabled],
  )
  const categoryOutcomes = useMemo(
    () => (isGroup ? buildLeafOutcomes(categories, pollStatus, pollData.tieBreakers, tieBreakerEnabled) : {}),
    [isGroup, categories, pollStatus, pollData.tieBreakers, tieBreakerEnabled],
  )

  // Name lookup for the tie-breaker banners ("X and Y are tied").
  const namesById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const c of contestants) map[c.contestantId] = c.name
    const walk = (cats: CategoryData[]) => {
      for (const cat of cats ?? []) {
        for (const c of cat.contestants ?? []) map[c.contestantId] = c.name
        if (cat.subcategories?.length) walk(cat.subcategories)
      }
    }
    walk(categories)
    return map
  }, [contestants, categories])

  const totalVotesSingle = contestants.reduce((s, c) => s + (c.votes ?? 0), 0)

  // Flattens contestants/[categories] into one searchable list for the
  // SearchBar — single-poll contestants carry no category, group-poll
  // contestants carry their LEAF category (votes always target a leaf) plus
  // a display path built by walking down from the top-level category.
  const searchableItems: SearchableContestant[] = useMemo(() => {
    if (isGroup) {
      const items: SearchableContestant[] = []
      const walk = (cats: CategoryData[], pathParts: string[]) => {
        for (const cat of cats ?? []) {
          const nextPath = [...pathParts, cat.name]
          if (cat.subcategories?.length) {
            walk(cat.subcategories, nextPath)
          } else {
            const outcome = categoryOutcomes[cat.categoryId]
            for (const c of cat.contestants ?? []) {
              items.push({
                contestant: c,
                category: cat,
                categoryPath: nextPath.join(" > "),
                isVotable: outcome ? isContestantVotable(outcome, c.contestantId) : false,
              })
            }
          }
        }
      }

      // recursively walk through each category
      walk(categories, [])
      return items
    }

    return contestants.map((c) => ({
      contestant: c,
      category: null,
      categoryPath: null,
      isVotable: isContestantVotable(singleOutcome, c.contestantId),
    }))
  }, [isGroup, categories, categoryOutcomes, contestants, singleOutcome])

  const handleVoteClick = (c: ContestantData, cat?: CategoryData) => {
    const outcome = cat ? categoryOutcomes[cat.categoryId] : singleOutcome
    if (!outcome || !isContestantVotable(outcome, c.contestantId)) return
    setSelectedContestant(c)
    setSelectedCategory(cat ?? null)
    setShowVoteModal(true)
  }

  // Resolve a shared contestant link against the poll data we already have —
  // no extra fetch needed, unlike the nomination flow's per-category lookup.
  const sharedMatch = useMemo(
    () => (sharedContestantId ? findContestantInPoll(pollData, sharedContestantId) : null),
    [pollData, sharedContestantId],
  )

  const sharedOutcome = sharedMatch
    ? (sharedMatch.category ? categoryOutcomes[sharedMatch.category.categoryId] : singleOutcome)
    : null
  const sharedVotable = sharedOutcome && sharedMatch
    ? isContestantVotable(sharedOutcome, sharedMatch.contestant.contestantId)
    : false

  const inactiveReason = contestantsTBD
    ? "Contestants haven't been finalised for this poll yet."
    : suspended
    ? "This poll has been suspended and voting is currently unavailable."
    : pollStatus === "notStarted"
    ? "Voting hasn't started yet — check back soon."
    : pollStatus === "ended" && !sharedVotable
    ? sharedOutcome?.phase === "tie-active" || sharedOutcome?.phase === "tie-fptp"
      ? "This poll has ended — a tie-breaker is deciding this category and this contestant isn't part of it."
      : "This poll has ended — voting is no longer available."
    : null

  // Strips ?contestant= off the URL once the shared-link flow is done.
  const clearContestantParam = () => {
    setSheetDismissed(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("contestant")
    router.replace(params.toString() ? `?${params.toString()}` : `/polls/${encodeURIComponent(pollData.pollName)}`, { scroll: false })
  }

  // Any scope still actively deciding a tie — suppresses the blanket "poll
  // has ended, voting unavailable" banner in favour of the per-section
  // tie-breaker banners, since voting on the tied contestants IS still open.
  const anyTieBreakerLive =
    singleOutcome.phase === "tie-active" || singleOutcome.phase === "tie-fptp" ||
    Object.values(categoryOutcomes).some((o) => o.phase === "tie-active" || o.phase === "tie-fptp")

  return (
    <>
      {/* Back */}
      {/* <div className="mb-6">
        <Link href="/vote" className="inline-flex items-center text-[#6b2fa5] hover:text-[#5a1f8a] font-medium transition-colors group">
          <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Polls
        </Link>
      </div> */}

      {suspended && <SuspendedBanner />}

      <PollHeaderCard
        pollData={pollData}
        pollStatus={pollStatus}
        suspended={suspended}
        isActive={isActive}
        isGroup={isGroup}
        onReport={() => setShowReportModal(true)}
        onCheckPayment={() => setShowCheckPaymentModal(true)}
      />

      {pollStatus !== "ended" && targetDate && !suspended && !contestantsTBD && (
        <CountdownBlock
          label={pollStatus === "notStarted" ? "Voting Starts In" : "Voting Ends In"}
          timeRemaining={timeRemaining}
        />
      )}

      {pollStatus === "ended" && !contestantsTBD && !anyTieBreakerLive && (
        <div className="mb-8 p-6 rounded-2xl bg-red-50 border-l-4 border-red-500">
          <p className="font-bold text-red-900">This poll has ended</p>
          <p className="text-red-700 text-sm mt-1">Voting is no longer available</p>
        </div>
      )}

      {contestantsTBD ? (
        <ComingSoonState pollName={pollData.pollName} />
      ) : (
        <>
          {searchableItems.length > 0 && (
            <SearchBar
              items={searchableItems}
              onVote={(c, cat) => handleVoteClick(c, cat ?? undefined)}
            />
          )}

          {isGroup ? (
            <GroupPollSection
              categories={categories}
              isActive={isActive}
              pollStatus={pollStatus}
              statsVisible={statsVisible}
              pollName={pollData.pollName}
              categoryOutcomes={categoryOutcomes}
              namesById={namesById}
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
              outcome={singleOutcome}
              namesById={namesById}
              pollName={pollData.pollName}
              onVoteClick={handleVoteClick}
              onFullscreen={setFullscreenContestant}
            />
          )}
        </>
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

      {showCheckPaymentModal && (
        <CheckVotePaymentModal
          pollId={voteId}
          pollName={pollData.pollName}
          onClose={() => setShowCheckPaymentModal(false)}
        />
      )}

      {sharedMatch && !sheetDismissed && !showVoteModal && (
        <SharedContestantSheet
          contestant={sharedMatch.contestant}
          categoryName={sharedMatch.category?.name ?? null}
          statsVisible={statsVisible}
          isActive={sharedVotable}
          inactiveReason={inactiveReason}
          onVote={() => {
            setSelectedContestant(sharedMatch.contestant)
            setSelectedCategory(sharedMatch.category)
            setShowVoteModal(true)
            clearContestantParam()
          }}
          onClose={clearContestantParam}
        />
      )}
    </>
  )
}
