"use client"

import { useEffect, useMemo } from "react"
import useSWR from "swr"
import { HOME_API, HOME_DEDUPE_MS, MARK_PAST_API } from "../constants"
import { hasPassed } from "../lib/format"
import type { EventCollection, HomeData, HomeEvent } from "../types"

const fetchHome = async (url: string): Promise<HomeData> => {
  const res = await fetch(url, { credentials: "include" })
  const json = await res.json()
  if (!json.success || !json.data) throw new Error(json.error || "Failed to load home data")
  return json.data as HomeData
}

const time = (v: string) => {
  const ms = new Date(v).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

// Event ids already reported this session — avoids re-POSTing on every render/visit.
const reported = new Set<string>()

/**
 * Home events, re-bucketed on the client: anything the (cached) API still
 * lists as today/upcoming but that has since passed moves to `past`.
 * SWR keeps the response cached, so coming back from an event page is instant.
 */
export function useHomeEvents() {
  const { data, isLoading } = useSWR<HomeData>(HOME_API, fetchHome, {
    revalidateOnFocus: false,
    dedupingInterval: HOME_DEDUPE_MS,
  })

  const { events, misplaced } = useMemo(() => {
    const buckets = {
      today: [...(data?.events.today ?? [])],
      upcoming: [...(data?.events.upcoming ?? [])],
      past: [...(data?.events.past ?? [])],
    }
    const moved: string[] = []
    const recheck = (list: HomeEvent[]) =>
      list.filter((ev) => {
        if (!hasPassed(ev.eventStartDate)) return true
        buckets.past.push(ev)
        moved.push(ev.eventId)
        return false
      })

    buckets.today = recheck(buckets.today)
    buckets.upcoming = recheck(buckets.upcoming)
    buckets.today.sort((a, b) => time(a.eventStartDate) - time(b.eventStartDate))
    buckets.upcoming.sort((a, b) => time(a.eventStartDate) - time(b.eventStartDate))
    buckets.past.sort((a, b) => time(b.eventStartDate) - time(a.eventStartDate))
    return { events: buckets, misplaced: moved }
  }, [data])

  // Fire-and-forget: tell the server about events that have passed.
  useEffect(() => {
    misplaced.forEach((eventId) => {
      if (reported.has(eventId)) return
      reported.add(eventId)
      fetch(MARK_PAST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      }).catch(() => {})
    })
  }, [misplaced])

  const collections: EventCollection[] = data?.collections ?? []
  return { events, collections, loading: isLoading }
}
