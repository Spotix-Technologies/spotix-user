"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Tag, FolderOpen } from "lucide-react"
import type { ContestantData, CategoryData } from "@/app/lib/voting-utils"
import type { ScopeOutcome } from "@/app/lib/voting-helpers"
import { isContestantVotable } from "@/app/lib/voting-helpers"
import { ContestantCard } from "./ContestantCard"
import { TieBreakerBanner } from "./TieBreakerBanner"

export interface CategoryPanelProps {
  category: CategoryData
  depth: number // 0 = top-level
  isActive: boolean
  pollStatus: "active" | "ended" | "notStarted"
  statsVisible: boolean
  pollName: string
  /** Outcome per LEAF category, keyed by categoryId — see voting-helpers.ts's buildLeafOutcomes. */
  categoryOutcomes: Record<string, ScopeOutcome>
  namesById: Record<string, string>
  onVote: (contestant: ContestantData, cat: CategoryData) => void
  onFullscreen: (contestant: ContestantData) => void
}

export function CategoryPanel({
  category, depth, isActive, pollStatus, statsVisible, pollName, categoryOutcomes, namesById, onVote, onFullscreen,
}: CategoryPanelProps) {
  const [open, setOpen] = useState(false)

  const hasSubcategories = (category.subcategories ?? []).length > 0
  const isLeaf = !hasSubcategories

  const totalVotes = isLeaf
    ? category.contestants.reduce((s, c) => s + (c.votes ?? 0), 0)
    : 0

  const outcome = isLeaf ? categoryOutcomes[category.categoryId] : undefined
  const tieBreakerLive = outcome?.phase === "tie-active" || outcome?.phase === "tie-fptp"

  const indentStyle = depth > 0 ? { marginLeft: `${Math.min(depth * 16, 48)}px` } : {}

  const bgClass = depth === 0
    ? "bg-white/80 border-slate-200"
    : depth === 1
    ? "bg-purple-50/60 border-purple-200/60"
    : "bg-blue-50/50 border-blue-200/50"

  return (
    <div style={indentStyle} className={`rounded-2xl border shadow-sm overflow-hidden ${bgClass} ${tieBreakerLive ? "ring-2 ring-[#6b2fa5]/40" : ""}`}>
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
            <p className="font-bold text-slate-900 truncate flex items-center gap-2">
              {category.name}
              {tieBreakerLive && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-[#6b2fa5] text-white px-2 py-0.5 rounded-full flex-shrink-0">
                  Tie-Breaker
                </span>
              )}
            </p>
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
                  pollName={pollName}
                  categoryOutcomes={categoryOutcomes}
                  namesById={namesById}
                  onVote={onVote}
                  onFullscreen={onFullscreen}
                />
              ))}
            </div>
          )}

          {isLeaf && (
            <div className="px-4 pb-5 sm:px-5">
              {pollStatus === "ended" && outcome && (
                <div className="pt-4">
                  <TieBreakerBanner outcome={outcome} namesById={namesById} />
                </div>
              )}

              {category.contestants.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">No contestants in this category yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {category.contestants.map((c) => (
                    <ContestantCard
                      key={c.contestantId}
                      contestant={c}
                      isWinner={outcome?.phase === "winner" && outcome.winnerId === c.contestantId}
                      isVotable={outcome ? isContestantVotable(outcome, c.contestantId) : false}
                      isTieBreakerContestant={tieBreakerLive && !!outcome && "contestantIds" in outcome && outcome.contestantIds.includes(c.contestantId)}
                      pollStatus={pollStatus}
                      statsVisible={statsVisible}
                      totalVotes={totalVotes}
                      pollName={pollName}
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
