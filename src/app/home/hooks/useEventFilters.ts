"use client"

import { useCallback, useMemo, useState } from "react"
import { MAX_CATEGORY_TABS } from "../constants"
import type { HomeData, HomeEvent, PriceFilter } from "../types"

/** Search text, category tab and price filter — plus derived suggestions/categories. */
export function useEventFilters(events: HomeData["events"]) {
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState<string | null>(null)
  const [price, setPrice] = useState<PriceFilter>(null)

  const allEvents = useMemo(
    () => [...events.today, ...events.upcoming, ...events.past],
    [events]
  )

  // Category tabs come from the events themselves, most common first.
  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    allEvents.forEach((e) => {
      const t = e.eventType?.trim()
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1)
    })
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CATEGORY_TABS)
      .map(([name]) => name)
  }, [allEvents])

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q.length < 2) return []
    return allEvents
      .filter((e) => e.eventName.toLowerCase().includes(q) || e.eventId.toLowerCase().includes(q))
      .slice(0, 5)
      .map((e) => ({ eventId: e.eventId, eventName: e.eventName }))
  }, [allEvents, searchQuery])

  const apply = useCallback(
    (list: HomeEvent[]) => {
      const q = searchQuery.trim().toLowerCase()
      return list.filter((e) => {
        if (q && !e.eventName.toLowerCase().includes(q) && !e.eventId.toLowerCase().includes(q)) return false
        if (category && e.eventType !== category) return false
        if (price === "free" && e.freeOrPaid) return false
        if (price === "paid" && !e.freeOrPaid) return false
        return true
      })
    },
    [searchQuery, category, price]
  )

  const filtered = useMemo(
    () => ({
      today: apply(events.today),
      upcoming: apply(events.upcoming),
      past: apply(events.past),
    }),
    [apply, events]
  )

  return {
    searchQuery,
    setSearchQuery,
    category,
    setCategory,
    price,
    setPrice,
    categories,
    suggestions,
    filtered,
    /** Applies the current search / category / price filters to any event list. */
    apply,
    /** Changes whenever any filter changes — use as a React `key` to reset pagination. */
    signature: `${searchQuery}|${category}|${price}`,
  }
}
