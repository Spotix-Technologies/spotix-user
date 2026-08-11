"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Vote, Trophy, ChevronRight, Loader2, Tag } from "lucide-react"

interface Contestant {
  contestantId: string
  name: string
  image: string
  votes: number
}

interface Category {
  categoryId:  string
  name:        string
  pollPrice:   number
  contestants: Contestant[]
}

interface PollData {
  pollName:        string
  pollImage:       string
  pollDescription: string
  pollEndDate:     string
  pollEndTime:     string
  pollPrice:       number
  pollCount:       number
  pollType?:       "single" | "group"
  contestants:     Contestant[]
  categories?:     Category[]
  statsVisible?:   boolean
}

interface VotingProps {
  votingId:       string
  votingPollName: string | null
}

function ContestantPreview({ c, totalVotes }: { c: Contestant; totalVotes: number }) {
  const pct = totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <img
        src={c.image || "/placeholder.svg"}
        alt={c.name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 font-mono w-8 text-right flex-shrink-0">{pct}%</span>
        </div>
      </div>
      <span className="text-xs text-slate-500 font-medium flex-shrink-0">
        {c.votes.toLocaleString()}
      </span>
    </div>
  )
}

export default function VotingSection({ votingId, votingPollName }: VotingProps) {
  const [poll,    setPoll]    = useState<PollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    if (!votingId) return
    setLoading(true)

    fetch(`/api/v1/polls/${encodeURIComponent(votingId)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.poll) setPoll(json.poll)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [votingId])

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading poll…</span>
      </div>
    )
  }

  if (error || !poll) return null

  const isPollEnded = poll.pollEndDate
    ? new Date() > new Date(`${poll.pollEndDate}T${poll.pollEndTime || "23:59"}`)
    : false

  const pollPath    = `/polls/${encodeURIComponent(votingPollName ?? votingId)}`
  const isGroup     = poll.pollType === "group"
  const statsVisible = poll.statsVisible ?? true

  // ── Group Poll ─────────────────────────────────────────────────────────────
  if (isGroup) {
    const categories    = poll.categories ?? []
    const categoryCount = categories.length

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Vote className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-white/70 font-medium">Group Poll</p>
              <h3 className="text-sm font-bold text-white leading-tight">{poll.pollName}</h3>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            isPollEnded
              ? "bg-white/20 text-white/80"
              : "bg-green-400/20 text-green-200 border border-green-400/30"
          }`}>
            {isPollEnded ? "Ended" : "Live"}
          </span>
        </div>

        {/* Body */}
        <div className="p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <Tag className="w-4 h-4 text-[#6b2fa5]" />
              <span><strong className="text-slate-800">{categoryCount}</strong> award {categoryCount === 1 ? "category" : "categories"}</span>
            </div>
          </div>

          {/* Category name pills */}
          {categoryCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {categories.slice(0, 4).map((cat) => (
                <span key={cat.categoryId}
                  className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-3 py-1 font-medium">
                  {cat.name}
                </span>
              ))}
              {categoryCount > 4 && (
                <span className="text-xs text-slate-400 px-2 py-1">
                  +{categoryCount - 4} more
                </span>
              )}
            </div>
          )}

          <Link
            href={pollPath}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all group"
          >
            {isPollEnded ? "View Final Results" : "Vote Now"}
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    )
  }

  // ── Single Poll ────────────────────────────────────────────────────────────
  const totalVotes = poll.contestants.reduce((s, c) => s + (c.votes || 0), 0)
  const sorted     = [...poll.contestants].sort((a, b) => b.votes - a.votes)
  const preview    = sorted.slice(0, 3)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Vote className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-white/70 font-medium">Event Poll</p>
            <h3 className="text-sm font-bold text-white leading-tight">{poll.pollName}</h3>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
          isPollEnded
            ? "bg-white/20 text-white/80"
            : "bg-green-400/20 text-green-200 border border-green-400/30"
        }`}>
          {isPollEnded ? "Ended" : "Live"}
        </span>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Stats row — total vote counts are intentionally not shown here;
            buyers landing on the event page don't need that number, and it
            isn't essential to deciding whether to vote. */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Trophy className="w-4 h-4 text-[#6b2fa5]" />
            <span><strong className="text-slate-800">{poll.contestants.length}</strong> contestants</span>
          </div>
        </div>

        {/* Contestant previews (only if stats are visible) */}
        {statsVisible && preview.length > 0 && (
          <div className="space-y-3 mb-5">
            {preview.map((c, i) => (
              <div key={c.contestantId} className="flex items-start gap-2">
                {i === 0 && totalVotes > 0 && (
                  <span className="text-xs mt-2.5 text-amber-500 font-bold w-4 flex-shrink-0">👑</span>
                )}
                {(i !== 0 || totalVotes === 0) && <span className="w-4 flex-shrink-0" />}
                <div className="flex-1">
                  <ContestantPreview c={c} totalVotes={totalVotes} />
                </div>
              </div>
            ))}
            {poll.contestants.length > 3 && (
              <p className="text-xs text-slate-400 text-center pt-1">
                +{poll.contestants.length - 3} more contestants on the poll page
              </p>
            )}
          </div>
        )}

        {/* Price note */}
        {poll.pollPrice > 0 && (
          <p className="text-xs text-slate-400 mb-4 text-center">
            ₦{poll.pollPrice.toLocaleString()} per vote
          </p>
        )}

        {/* CTA */}
        <Link
          href={pollPath}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all group"
        >
          {isPollEnded ? "View Final Results" : "Vote Now"}
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  )
}
