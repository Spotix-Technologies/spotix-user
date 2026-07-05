"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Flag, ChevronDown, ChevronUp, Users, Tag, FolderOpen } from "lucide-react"
import { getPollStatus, type VoteData, type ContestantData, type CategoryData } from "@/app/lib/voting-utils"
import { FullscreenModal }  from "./components/FullscreenModal"
import { VoteModal }        from "./components/VoteModal"
import { ReportPollModal }  from "./components/ReportPollModal"
import { ContestantCard }   from "./components/ContestantCard"

interface PollClientProps {
  pollData: VoteData
  voteId:   string
  userId?:  string | null
}

interface TimeRemaining {
  days: number; hours: number; minutes: number; seconds: number; total: number
}

function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const total = targetDate.getTime() - Date.now()
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 }
  return {
    total,
    days:    Math.floor(total / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  }
}

function fmt(n: number) { return String(n).padStart(2, "0") }

// ─── Suspended Banner ─────────────────────────────────────────────────────────

function SuspendedBanner() {
  return (
    <div className="mb-8 p-6 rounded-2xl bg-red-50 border-l-4 border-red-600 shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Flag className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <p className="font-bold text-red-900 text-lg">This poll has been suspended by Spotix</p>
          <p className="text-red-700 text-sm mt-1">
            This poll is currently unavailable due to a policy violation or investigation.
            Voting and payouts are disabled. If you believe this is an error, please contact Spotix support.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Category / Sub-category Panel (recursive) ────────────────────────────────

interface CategoryPanelProps {
  category:     CategoryData
  depth:        number           // 0 = top-level
  isActive:     boolean
  pollStatus:   "active" | "ended" | "notStarted"
  statsVisible: boolean
  onVote:       (contestant: ContestantData, cat: CategoryData) => void
  onFullscreen: (contestant: ContestantData) => void
}

function CategoryPanel({
  category, depth, isActive, pollStatus, statsVisible, onVote, onFullscreen,
}: CategoryPanelProps) {
  const [open, setOpen] = useState(false)

  const hasSubcategories = (category.subcategories ?? []).length > 0
  const isLeaf           = !hasSubcategories

  // For leaf nodes compute vote totals
  const totalVotes = isLeaf
    ? category.contestants.reduce((s, c) => s + (c.votes ?? 0), 0)
    : 0

  const winner = isLeaf && pollStatus === "ended" && category.contestants.length > 0
    ? category.contestants.reduce((h, c) => ((c.votes ?? 0) > (h.votes ?? 0) ? c : h), category.contestants[0])
    : null

  const indentStyle = depth > 0
    ? { marginLeft: `${Math.min(depth * 16, 48)}px` }
    : {}

  const bgClass = depth === 0
    ? "bg-white/80 border-slate-200"
    : depth === 1
    ? "bg-purple-50/60 border-purple-200/60"
    : "bg-blue-50/50 border-blue-200/50"

  return (
    <div style={indentStyle} className={`rounded-2xl border shadow-sm overflow-hidden ${bgClass}`}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-black/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
            ${depth === 0 ? "bg-[#6b2fa5]/10" : "bg-white/70"}`}>
            {hasSubcategories
              ? <FolderOpen className="w-4 h-4 text-[#6b2fa5]" />
              : <Tag className="w-4 h-4 text-[#6b2fa5]" />}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{category.name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasSubcategories
                ? `${(category.subcategories ?? []).length} sub-categor${(category.subcategories ?? []).length === 1 ? "y" : "ies"}`
                : `${category.contestants.length} contestant${category.contestants.length !== 1 ? "s" : ""}
                  ${category.pollPrice > 0 ? ` · ₦${category.pollPrice.toLocaleString()}/vote` : " · Free"}
                  ${statsVisible && totalVotes > 0 ? ` · ${totalVotes.toLocaleString()} votes` : ""}`
              }
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>

      {/* Body */}
      {open && (
        <div className="border-t border-inherit">
          {/* Nested sub-categories */}
          {hasSubcategories && (
            <div className="p-3 sm:p-4 space-y-3">
              {(category.subcategories ?? []).map((sub) => (
                <CategoryPanel
                  key={sub.categoryId}
                  category={sub}
                  depth={depth + 1}
                  isActive={isActive}
                  pollStatus={pollStatus}
                  statsVisible={statsVisible}
                  onVote={onVote}
                  onFullscreen={onFullscreen}
                />
              ))}
            </div>
          )}

          {/* Leaf: contestant grid */}
          {isLeaf && (
            <div className="px-4 pb-5 sm:px-5">
              {category.contestants.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">No contestants in this category yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {category.contestants.map((c) => (
                    <ContestantCard
                      key={c.contestantId}
                      contestant={c}
                      isWinner={winner?.contestantId === c.contestantId}
                      isActive={isActive}
                      pollStatus={pollStatus}
                      statsVisible={statsVisible}
                      totalVotes={totalVotes}
                      onVoteClick={(cont) => onVote(cont, category)}
                      onFullscreen={onFullscreen}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export default function PollClient({ pollData, voteId, userId }: PollClientProps) {
  const [selectedContestant,   setSelectedContestant]   = useState<ContestantData | null>(null)
  const [selectedCategory,     setSelectedCategory]     = useState<CategoryData | null>(null)
  const [fullscreenContestant, setFullscreenContestant] = useState<ContestantData | null>(null)
  const [showVoteModal,        setShowVoteModal]         = useState(false)
  const [showReportModal,      setShowReportModal]       = useState(false)
  const [timeRemaining,        setTimeRemaining]         = useState<TimeRemaining>({
    days: 0, hours: 0, minutes: 0, seconds: 0, total: 0,
  })

  const pollType    = pollData.pollType    ?? "single"
  const isGroup     = pollType === "group"
  const statsVisible = pollData.statsVisible ?? true
  const suspended   = pollData.suspended   ?? false

  const pollStatus = useMemo(
    () => getPollStatus(pollData.pollStartDate, pollData.pollStartTime, pollData.pollEndDate, pollData.pollEndTime),
    [pollData.pollStartDate, pollData.pollStartTime, pollData.pollEndDate, pollData.pollEndTime],
  )

  const targetDate = useMemo(() => {
    if (pollStatus === "notStarted") return new Date(`${pollData.pollStartDate}T${pollData.pollStartTime}`)
    if (pollStatus === "active")     return new Date(`${pollData.pollEndDate}T${pollData.pollEndTime}`)
    return null
  }, [pollStatus, pollData])

  useEffect(() => {
    if (!targetDate) return
    const update = () => setTimeRemaining(calculateTimeRemaining(targetDate))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  const contestants  = pollData.contestants ?? []
  const categories   = pollData.categories  ?? []
  const isActive     = pollStatus === "active" && !suspended

  // Single poll winner
  const winner = useMemo(() => {
    if (pollStatus !== "ended" || contestants.length === 0) return null
    return contestants.reduce((h, c) => ((c.votes ?? 0) > (h.votes ?? 0) ? c : h), contestants[0])
  }, [contestants, pollStatus])

  const totalVotesSingle = contestants.reduce((s, c) => s + (c.votes ?? 0), 0)

  /** Recursively count all top-level + sub-categories for the group summary */
  function countAllCategories(cats: CategoryData[]): number {
    let n = cats.length
    for (const cat of cats) n += countAllCategories(cat.subcategories ?? [])
    return n
  }

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

      {/* Suspended banner */}
      {suspended && <SuspendedBanner />}

      {/* Poll header */}
      <div className="mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xl">
          <div className="mb-6 h-48 sm:h-64 rounded-xl overflow-hidden bg-slate-100">
            <img src={pollData.pollImage || "/placeholder.svg"} alt={pollData.pollName}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">{pollData.pollName}</h1>
          <p className="text-slate-600 mb-6 leading-relaxed">{pollData.pollDescription}</p>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status badge */}
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

            {/* Report button */}
            <button onClick={() => setShowReportModal(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full border border-slate-200 hover:border-red-200 transition-all">
              <Flag className="w-3 h-3" /> Report Poll
            </button>
          </div>
        </div>
      </div>

      {/* Countdown */}
      {pollStatus !== "ended" && targetDate && !suspended && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-white text-xl font-bold text-center mb-6">
              {pollStatus === "notStarted" ? "Voting Starts In" : "Voting Ends In"}
            </h2>
            <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-2xl mx-auto">
              {([["Days", timeRemaining.days], ["Hours", timeRemaining.hours], ["Minutes", timeRemaining.minutes], ["Seconds", timeRemaining.seconds]] as [string, number][]).map(([label, val]) => (
                <div key={label} className="bg-white/10 backdrop-blur-md rounded-xl p-4 sm:p-6 text-center">
                  <div className="text-3xl sm:text-5xl font-bold text-white mb-2">{fmt(val)}</div>
                  <div className="text-xs sm:text-sm text-white/80 font-semibold uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {pollStatus === "ended" && (
        <div className="mb-8 p-6 rounded-2xl bg-red-50 border-l-4 border-red-500">
          <p className="font-bold text-red-900">This poll has ended</p>
          <p className="text-red-700 text-sm mt-1">Voting is no longer available</p>
        </div>
      )}

      {/* ── GROUP POLL ───────────────────────────────────────────────────── */}
      {isGroup && (
        <div className="space-y-3">
          <div className="mb-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
              {pollStatus === "ended" ? "Final Results" : "Award Categories"}
            </h2>
            <p className="text-slate-600">
              {isActive
                ? "Open a category and vote for your favourite contestant"
                : pollStatus === "notStarted"
                ? "Categories will be available once voting starts"
                : "Voting has ended — see the final results below"}
            </p>
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-16 bg-white/50 rounded-2xl border-2 border-dashed border-slate-300">
              <p className="text-slate-500 font-medium">No categories added yet</p>
            </div>
          ) : (
            categories.map((cat) => (
              <CategoryPanel
                key={cat.categoryId}
                category={cat}
                depth={0}
                isActive={isActive}
                pollStatus={pollStatus}
                statsVisible={statsVisible}
                onVote={handleVoteClick}
                onFullscreen={setFullscreenContestant}
              />
            ))
          )}
        </div>
      )}

      {/* ── SINGLE POLL ──────────────────────────────────────────────────── */}
      {!isGroup && (
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
                isWinner={pollStatus === "ended" && winner?.contestantId === c.contestantId}
                isActive={isActive}
                pollStatus={pollStatus}
                statsVisible={statsVisible}
                totalVotes={totalVotesSingle}
                onVoteClick={handleVoteClick}
                onFullscreen={setFullscreenContestant}
              />
            ))}
          </div>

          {contestants.length === 0 && (
            <div className="text-center py-16 bg-white/50 rounded-2xl border-2 border-dashed border-slate-300">
              <p className="text-slate-500 font-medium">No contestants added yet</p>
            </div>
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
    </>
  )
}
