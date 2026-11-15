"use client"

import { useCallback, useEffect, useState } from "react"
import { CALENDAR_VIEW_STORAGE_KEY } from "../constants"

/** Persisted home-page settings. Currently just "Calendar view". */
export function useHomeSettings() {
  const [calendarView, setCalendarViewState] = useState(false)

  // Read after mount so server and client markup always match.
  useEffect(() => {
    try {
      setCalendarViewState(localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY) === "1")
    } catch {
      /* storage unavailable (private mode) — stay on the list view */
    }
  }, [])

  const setCalendarView = useCallback((on: boolean) => {
    setCalendarViewState(on)
    try {
      localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, on ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [])

  return { calendarView, setCalendarView }
}
