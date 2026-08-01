"use client"

import { useState, useMemo } from "react"
import { Search, Users } from "lucide-react"
import { NomineeCard } from "./NomineeCard"

interface Nominee {
  nomineeId: string
  name: string
  count: number
}

interface NomineeListProps {
  nominees: Nominee[]
  loading: boolean
  pollId: string
  categoryId: string
  categoryName: string
  onNominate: (name: string) => void
  nominatingName: string | null
  alreadyNominated: boolean
  /** Poll-wide Nomination Threshold, or null for unlimited. A nominee is
   *  "maxed" once their count reaches this. */
  nominationThreshold: number | null
}

export function NomineeList({
  nominees, loading, pollId, categoryId, categoryName, onNominate, nominatingName, alreadyNominated,
  nominationThreshold,
}: NomineeListProps) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return nominees
    return nominees.filter((n) => n.name.toLowerCase().includes(q))
  }, [nominees, search])

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (nominees.length === 0) {
    return (
      <div className="text-center py-10 bg-white/50 rounded-2xl border-2 border-dashed border-slate-300">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-slate-500 text-sm font-medium">No nominees yet — be the first!</p>
      </div>
    )
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search nominees…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-sm text-black placeholder:text-slate-400 outline-none focus:border-[#6b2fa5] focus:ring-2 focus:ring-[#6b2fa5]/20"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-6">No nominees match "{search}".</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((n) => (
            <NomineeCard
              key={n.nomineeId}
              nomineeId={n.nomineeId}
              name={n.name}
              count={n.count}
              pollId={pollId}
              categoryId={categoryId}
              categoryName={categoryName}
              onNominate={() => onNominate(n.name)}
              submitting={nominatingName === n.name}
              disabled={alreadyNominated}
              maxed={nominationThreshold != null && n.count >= nominationThreshold}
            />
          ))}
        </div>
      )}
    </div>
  )
}
