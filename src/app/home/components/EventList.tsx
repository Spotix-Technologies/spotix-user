"use client"

import React, { useRef, useState } from "react"
import EventRow, { EventRowSkeleton } from "./EventRow"
import Pagination from "./Pagination"
import type { HomeEvent } from "../types"

interface EventListProps {
  title: string
  events: HomeEvent[]
  loading: boolean
  pageSize: number
  past?: boolean
  /** Render nothing (instead of an empty state) when there are no events. */
  hideWhenEmpty?: boolean
  emptyText?: string
}

/** A titled, paginated list of event rows. Give it a `key` that changes with the filters to reset paging. */
const EventList: React.FC<EventListProps> = ({
  title,
  events,
  loading,
  pageSize,
  past = false,
  hideWhenEmpty = false,
  emptyText = "No events found.",
}) => {
  const [page, setPage] = useState(1)
  const ref = useRef<HTMLElement>(null)

  if (!loading && events.length === 0 && hideWhenEmpty) return null

  const pageCount = Math.max(1, Math.ceil(events.length / pageSize))
  const current = Math.min(page, pageCount)
  const visible = events.slice((current - 1) * pageSize, current * pageSize)

  const goTo = (p: number) => {
    setPage(p)
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <section ref={ref} className="scroll-mt-24">
      <h2 className="mb-4 flex items-baseline gap-2 text-lg font-semibold text-gray-900">
        {title}
        {!loading && <span className="text-sm font-normal text-gray-400">{events.length}</span>}
      </h2>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <EventRowSkeleton key={i} />)
        ) : events.length > 0 ? (
          visible.map((e) => <EventRow key={e.eventId} event={e} past={past} />)
        ) : (
          <p className="rounded-3xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
            {emptyText}
          </p>
        )}
      </div>

      {!loading && <Pagination page={current} pageCount={pageCount} onChange={goTo} />}
    </section>
  )
}

export default EventList
