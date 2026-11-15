"use client"

import useSWR from "swr"
import { CALENDAR_API, CALENDAR_DEDUPE_MS } from "../constants"
import type { CalendarMonthData } from "../types"

const fetchMonth = async (url: string): Promise<CalendarMonthData> => {
  const res = await fetch(url, { credentials: "include" })
  const json = await res.json().catch(() => null)
  if (res.status === 429) throw new Error("rate_limited")
  if (!res.ok || !json?.success || !json.data) throw new Error(json?.error || "Failed to load calendar")
  return json.data as CalendarMonthData
}

/**
 * Events for one month ("YYYY-MM"). Only fetched while `enabled` (Calendar view on)
 * and only for the month being viewed. SWR keeps visited months cached, so paging
 * back and forth costs nothing; a visit re-fetches at most once per 5 minutes.
 */
export function useCalendarMonth(month: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<CalendarMonthData>(
    enabled ? `${CALENDAR_API}?month=${month}` : null,
    fetchMonth,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: CALENDAR_DEDUPE_MS,
      shouldRetryOnError: false,
    }
  )
  return {
    events: data?.events ?? [],
    truncated: data?.truncated ?? false,
    loading: isLoading,
    error: error as Error | undefined,
    retry: () => mutate(),
  }
}
