"use client"

import { useRef, useState, useMemo } from "react"
import { Tag, Search, ChevronLeft, ChevronRight, X } from "lucide-react"

export interface NominationCategory {
  categoryId: string
  name: string
}

interface CategoryTabsProps {
  categories: NominationCategory[]
  activeCategoryId: string | null
  onSelect: (categoryId: string) => void
}

const SCROLL_STEP = 220

export function CategoryTabs({ categories, activeCategoryId, onSelect }: CategoryTabsProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, search])

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" })
  }

  if (categories.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {categories.length > 4 && (
          <>
            <button
              onClick={() => scrollBy(-SCROLL_STEP)}
              aria-label="Scroll categories left"
              className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-[#6b2fa5] hover:border-[#6b2fa5] transition-colors flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollBy(SCROLL_STEP)}
              aria-label="Scroll categories right"
              className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-[#6b2fa5] hover:border-[#6b2fa5] transition-colors flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          onClick={() => setShowSearch((v) => !v)}
          aria-label="Search categories"
          className={`flex items-center justify-center w-7 h-7 rounded-full border transition-colors flex-shrink-0
            ${showSearch ? "bg-[#6b2fa5] border-[#6b2fa5] text-white" : "bg-white border-slate-200 text-slate-500 hover:text-[#6b2fa5] hover:border-[#6b2fa5]"}`}
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        {showSearch && (
          <div className="relative flex-1">
            <input
              type="text"
              autoFocus
              placeholder="Search categories…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 rounded-full border border-slate-300 text-sm text-black placeholder:text-slate-400 outline-none focus:border-[#6b2fa5]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">No categories match "{search}".</p>
      ) : (
        <div
          ref={scrollerRef}
          className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scroll-smooth touch-pan-x"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {filtered.map((cat) => {
            const active = cat.categoryId === activeCategoryId
            return (
              <button
                key={cat.categoryId}
                onClick={() => onSelect(cat.categoryId)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors flex-shrink-0
                  ${active
                    ? "bg-[#6b2fa5] text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-[#6b2fa5]/40"}`}
              >
                <Tag className="w-3.5 h-3.5" />
                {cat.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
