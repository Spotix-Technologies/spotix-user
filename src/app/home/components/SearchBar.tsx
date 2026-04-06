"use client"

import React from "react"
import { Search, X } from "lucide-react"

interface SearchSuggestion {
  eventName: string
  eventId: string
}

interface SearchBarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchSuggestions: SearchSuggestion[]
  showSuggestions: boolean
  setShowSuggestions: (show: boolean) => void
  filterType: string | null
  setFilterType: (type: string | null) => void
  priceFilter: string | null
  setPriceFilter: (filter: string | null) => void
  hasActiveFilters: boolean
  onSuggestionClick: (suggestion: SearchSuggestion) => void
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  setSearchQuery,
  searchSuggestions,
  showSuggestions,
  setShowSuggestions,
  filterType,
  setFilterType,
  priceFilter,
  setPriceFilter,
  hasActiveFilters,
  onSuggestionClick,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
          <div className="flex flex-col gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search events by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full pl-12 pr-4 py-3 sm:py-3.5 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder:text-gray-500 transition-all duration-200"
                />
              </div>
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-10">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => onSuggestionClick(suggestion)}
                      className="px-4 py-3 hover:bg-purple-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{suggestion.eventName}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Type Filter */}
              <select
                value={filterType || ""}
                onChange={(e) => setFilterType(e.target.value || null)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 font-medium appearance-none cursor-pointer transition-all duration-200"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: "right 0.5rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.5em 1.5em",
                  paddingRight: "2.5rem",
                }}
              >
                <option value="">All Types</option>
                <option value="Night party">Night Party</option>
                <option value="Concert">Concert</option>
                <option value="Religious">Religious</option>
                <option value="Conference">Conference</option>
                <option value="Workshop">Workshop</option>
                <option value="Other">Other</option>
              </select>

              {/* Price Filter */}
              <select
                value={priceFilter || ""}
                onChange={(e) => setPriceFilter(e.target.value || null)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-gray-900 font-medium appearance-none cursor-pointer transition-all duration-200"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: "right 0.5rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.5em 1.5em",
                  paddingRight: "2.5rem",
                }}
              >
                <option value="">All Prices</option>
                <option value="free">Free Events</option>
                <option value="paid">Paid Events</option>
              </select>
            </div>

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <span className="text-sm font-medium text-gray-700">Active filters:</span>
                {filterType && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {filterType}
                    <button
                      onClick={() => setFilterType(null)}
                      className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                      aria-label="Remove type filter"
                    >
                      <X size={14} />
                    </button>
                  </span>
                )}
                {priceFilter && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {priceFilter === "free" ? "Free" : "Paid"}
                    <button
                      onClick={() => setPriceFilter(null)}
                      className="hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                      aria-label="Remove price filter"
                    >
                      <X size={14} />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton
export const SearchBarSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 animate-pulse">
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded-xl" />
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 h-12 bg-gray-200 rounded-xl" />
              <div className="flex-1 h-12 bg-gray-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchBar