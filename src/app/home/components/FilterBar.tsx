"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"
import { eventHref } from "../lib/format"
import type { PriceFilter } from "../types"

interface Suggestion {
  eventId: string
  eventName: string
}

interface FilterBarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  suggestions: Suggestion[]
  categories: string[]
  category: string | null
  onCategoryChange: (c: string | null) => void
  price: PriceFilter
  onPriceChange: (p: PriceFilter) => void
}

const PRICE_OPTIONS: { label: string; value: PriceFilter }[] = [
  { label: "All", value: null },
  { label: "Free", value: "free" },
  { label: "Paid", value: "paid" },
]

const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  suggestions,
  categories,
  category,
  onCategoryChange,
  price,
  onPriceChange,
}) => {
  const [focused, setFocused] = useState(false)
  const showSuggestions = focused && suggestions.length > 0

  const tab = (active: boolean) =>
    `whitespace-nowrap px-4 py-2 text-sm transition-colors ${
      active ? "font-semibold text-[#6b2fa5]" : "text-gray-600 hover:text-gray-900"
    }`

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm">
      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search events by name or ID"
          aria-label="Search events"
          className="w-full rounded-2xl bg-gray-50 py-3 pl-11 pr-10 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          >
            <X size={14} />
          </button>
        )}
        {showSuggestions && (
          <ul className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
            {suggestions.map((s) => (
              <li key={s.eventId} className="border-b border-gray-100 last:border-b-0">
                <Link
                  href={eventHref(s.eventId)}
                  prefetch={false}
                  className="block px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
                >
                  {s.eventName}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Category tabs + price */}
      <div className="flex items-center gap-2 pt-1">
        <div role="tablist" aria-label="Event categories" className="no-scrollbar flex min-w-0 flex-1 items-center overflow-x-auto">
          <button role="tab" aria-selected={category === null} onClick={() => onCategoryChange(null)} className={tab(category === null)}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => onCategoryChange(category === c ? null : c)}
              className={`border-l border-gray-200 ${tab(category === c)}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div role="group" aria-label="Price" className="flex shrink-0 rounded-full bg-gray-100 p-0.5 text-xs">
          {PRICE_OPTIONS.map((o) => (
            <button
              key={o.label}
              aria-pressed={price === o.value}
              onClick={() => onPriceChange(o.value)}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors ${
                price === o.value ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FilterBar
