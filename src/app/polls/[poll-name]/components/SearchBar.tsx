"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import type { ContestantData, CategoryData } from "@/app/lib/voting-utils"

/** One searchable contestant, flattened out of either contestants[] (single
 *  poll) or the category tree (group poll) — see buildSearchableContestants
 *  in pollClient.tsx. */
export interface SearchableContestant {
  contestant: ContestantData
  /** Leaf category this contestant belongs to — null for single-poll contestants. */
  category: CategoryData | null
  /** Display path for group polls, asper "Fashion > Menswear" and null for single polls. */
  categoryPath: string | null
  isVotable: boolean
}

interface SearchBarProps {
  items: SearchableContestant[]
  onVote: (contestant: ContestantData, category: CategoryData | null) => void
}

const MIN_QUERY_LENGTH = 3

export function SearchBar({ items, onVote }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close the results dropdown on outside click.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const trimmedQuery = query.trim()
  const isSearching = trimmedQuery.length >= MIN_QUERY_LENGTH

  const results = useMemo(() => {
    if (!isSearching) return []
    const q = trimmedQuery.toLowerCase()
    return items.filter(
      ({ contestant }) =>
        contestant.name.toLowerCase().includes(q) ||
        contestant.contestantId.toLowerCase().includes(q),
    )
  }, [items, trimmedQuery, isSearching])

  return (
    <div ref={containerRef} className="relative mb-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search contestants by name or ID..."
          className="w-full pl-11 pr-11 py-3.5 rounded-xl border-2 border-slate-200 bg-white/90 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#6b2fa5] transition-colors"
        />
        {query.length > 0 && (
          <button
            onClick={() => { setQuery(""); setIsOpen(false) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Results dropdown — z-50 so it always renders above the category
          list / contestant grid below it, never behind it. */}
      {isOpen && isSearching && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-xl border-2 border-slate-200 shadow-2xl max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-slate-500 text-center">
              No contestants found matching &quot;{trimmedQuery}&quot;
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map(({ contestant, category, categoryPath, isVotable }) => (
                <li key={`${category?.categoryId ?? "single"}-${contestant.contestantId}`} className="flex items-center gap-3 p-3">
                  <img
                    src={contestant.image || "/placeholder.svg"}
                    alt={contestant.name}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-slate-100"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate">{contestant.name}</p>
                    <p className="text-xs text-slate-500 font-mono truncate">{contestant.contestantId}</p>
                    {categoryPath && (
                      <p className="text-xs text-[#6b2fa5] truncate mt-0.5">{categoryPath}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      onVote(contestant, category)
                      setIsOpen(false)
                      setQuery("")
                    }}
                    disabled={!isVotable}
                    className={`flex-shrink-0 py-2 px-4 rounded-lg font-semibold text-sm transition-all
                      ${isVotable
                        ? "bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] text-white hover:shadow-md active:scale-95"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                  >
                    Vote
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
