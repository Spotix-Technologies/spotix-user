"use client"

import React, { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import DayDrawer from "./DayDrawer"
import { useCalendarMonth } from "../hooks/useCalendarMonth"
import { dayKey, hasPassed, todayKey } from "../lib/format"
import type { HomeEvent } from "../types"

interface EventCalendarProps {
  /** Applies the page's search / category / price filters to the month's events. */
  applyFilters: (list: HomeEvent[]) => HomeEvent[]
}

/** Keep in sync with MAX_EVENTS in /api/v1/home/calendar. */
const MONTH_CAP = 50

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MAX_CHIPS = 2
const MAX_DOTS = 3

const pad2 = (n: number) => String(n).padStart(2, "0")
const keyOf = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`

const EventCalendar: React.FC<EventCalendarProps> = ({ applyFilters }) => {
  const [cursor, setCursor] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [selected, setSelected] = useState<string | null>(null)

  const monthKey = `${cursor.year}-${pad2(cursor.month + 1)}`
  const { events: monthEvents, truncated, loading, error, retry } = useCalendarMonth(monthKey)
  const events = useMemo(() => applyFilters(monthEvents), [applyFilters, monthEvents])

  const byDay = useMemo(() => {
    const map = new Map<string, HomeEvent[]>()
    events.forEach((e) => {
      const k = dayKey(e.eventStartDate)
      if (!k) return
      const list = map.get(k)
      if (list) list.push(e)
      else map.set(k, [e])
    })
    map.forEach((list) =>
      list.sort((a, b) => (a.eventStart ?? "").localeCompare(b.eventStart ?? "") || a.eventName.localeCompare(b.eventName))
    )
    return map
  }, [events])

  const { year, month } = cursor
  const today = todayKey()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Weeks start on Monday.
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7

  const monthCount = events.length

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })

  const shift = (delta: number) =>
    setCursor(({ year: y, month: m }) => {
      const d = new Date(y, m + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  const goToday = () => {
    const n = new Date()
    setCursor({ year: n.getFullYear(), month: n.getMonth() })
  }

  const navBtn = "rounded-full border border-gray-200 p-2 text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"

  return (
    <section aria-label="Events calendar">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-gray-900">{monthLabel}</h2>
          {!error && (
            <p className="text-sm text-gray-500" aria-live="polite">
              {loading ? (
                "Checking..."
              ) : (
                <>
                  {monthCount} {monthCount === 1 ? "event" : "events"} this month
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={goToday} className="rounded-full border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900">
            Today
          </button>
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className={navBtn}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" onClick={() => shift(1)} aria-label="Next month" className={navBtn}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
              <span className="sm:hidden">{d[0]}</span>
              <span className="hidden sm:inline">{d}</span>
            </div>
          ))}
        </div>

        <div className={`grid grid-cols-7 ${loading ? "animate-pulse" : ""}`}>
          {Array.from({ length: totalCells }).map((_, i) => {
            const dayNum = i - offset + 1
            const inMonth = dayNum >= 1 && dayNum <= daysInMonth
            const edge = "border-b border-r border-gray-100 [&:nth-child(7n)]:border-r-0"

            if (!inMonth) return <div key={i} className={`min-h-14 bg-gray-50/60 md:min-h-28 ${edge}`} />

            const key = keyOf(year, month, dayNum)
            const list = loading ? [] : byDay.get(key) ?? []
            const isToday = key === today
            const isSelected = key === selected
            const label = new Date(year, month, dayNum).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })

            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(key)}
                aria-label={`${label}, ${list.length} ${list.length === 1 ? "event" : "events"}`}
                aria-pressed={isSelected}
                className={`flex min-h-14 flex-col items-stretch gap-1 p-1.5 text-left transition-colors hover:bg-[#6b2fa5]/5 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6b2fa5] md:min-h-28 md:p-2 ${edge} ${
                  isSelected ? "bg-[#6b2fa5]/5 ring-2 ring-inset ring-[#6b2fa5]" : ""
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center self-center rounded-full text-xs font-medium md:self-start md:text-sm ${
                    isToday ? "bg-[#6b2fa5] text-white" : "text-gray-700"
                  }`}
                >
                  {dayNum}
                </span>

                {/* Mobile: dots */}
                {list.length > 0 && (
                  <span className="flex items-center justify-center gap-0.5 md:hidden" aria-hidden="true">
                    {list.slice(0, MAX_DOTS).map((e) => (
                      <span
                        key={e.eventId}
                        className={`h-1.5 w-1.5 rounded-full ${hasPassed(e.eventStartDate) ? "bg-gray-400" : "bg-[#6b2fa5]"}`}
                      />
                    ))}
                    {list.length > MAX_DOTS && <span className="text-[9px] font-semibold text-gray-500">+</span>}
                  </span>
                )}

                {/* Desktop: event chips */}
                {list.length > 0 && (
                  <span className="hidden min-w-0 flex-col gap-1 md:flex" aria-hidden="true">
                    {list.slice(0, MAX_CHIPS).map((e) => (
                      <span
                        key={e.eventId}
                        className={`truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                          hasPassed(e.eventStartDate) ? "bg-gray-100 text-gray-500" : "bg-[#6b2fa5]/10 text-[#6b2fa5]"
                        }`}
                      >
                        {e.eventName}
                      </span>
                    ))}
                    {list.length > MAX_CHIPS && (
                      <span className="px-1 text-[11px] font-medium text-gray-500">+{list.length - MAX_CHIPS} more</span>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>
            {error.message === "rate_limited"
              ? "You're browsing a little fast — please wait a minute and try again."
              : "Couldn't load events for this month."}
          </span>
          <button type="button" onClick={retry} className="shrink-0 font-medium underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      {truncated && !loading && !error && (
        <p className="mt-3 text-center text-xs text-gray-500">
          Showing the first {MONTH_CAP} events this month. Use the search or filters to narrow it down.
        </p>
      )}

      {selected && <DayDrawer day={selected} events={byDay.get(selected) ?? []} onClose={() => setSelected(null)} />}
    </section>
  )
}

export default EventCalendar
