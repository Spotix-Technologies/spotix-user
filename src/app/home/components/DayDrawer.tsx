"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { Clock, MapPin, X, ChevronRight } from "lucide-react"
import { eventHref, formatDayLong, hasPassed, optimizeImage } from "../lib/format"
import type { HomeEvent } from "../types"

interface DayDrawerProps {
  /** "YYYY-MM-DD" of the selected day. */
  day: string
  events: HomeEvent[]
  onClose: () => void
}

const CLOSE_MS = 250
const DRAG_CLOSE_PX = 90

function DayEventCard({ event }: { event: HomeEvent }) {
  const [failed, setFailed] = useState(false)
  const past = hasPassed(event.eventStartDate)
  const isFree = !event.freeOrPaid

  return (
    <Link
      href={eventHref(event.eventId)}
      prefetch={false}
      className={`group flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 transition hover:border-[#6b2fa5]/40 hover:shadow-sm ${
        past ? "opacity-80" : ""
      }`}
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
        {!failed ? (
          <img
            src={optimizeImage(event.eventImage, 240, 240)}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover ${past ? "grayscale-[40%]" : ""}`}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[10px] text-gray-400">No image</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {event.eventStart && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
              <Clock size={12} aria-hidden="true" />
              {event.eventStart}
            </span>
          )}
          {past ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">Past</span>
          ) : isFree ? (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">Free</span>
          ) : (
            <span className="rounded-full bg-[#6b2fa5]/10 px-2 py-0.5 text-[11px] font-medium text-[#6b2fa5]">Paid</span>
          )}
        </div>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{event.eventName}</h3>
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <MapPin size={12} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{event.venue}</span>
        </p>
      </div>

      <ChevronRight size={18} className="shrink-0 self-center text-gray-300 group-hover:text-[#6b2fa5]" aria-hidden="true" />
    </Link>
  )
}

/**
 * Events for one day. A bottom sheet below `md` (phones), a larger right-hand
 * side drawer from `md` up. The layout switch is pure CSS, so there is no
 * device sniffing and no hydration mismatch.
 */
const DayDrawer: React.FC<DayDrawerProps> = ({ day, events, onClose }) => {
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)

  // Slide in on mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const requestClose = useCallback(() => {
    if (closeTimer.current) return
    setEntered(false)
    closeTimer.current = setTimeout(onClose, CLOSE_MS)
  }, [onClose])

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  // Esc to close, lock page scroll, move focus into the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeBtn.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [requestClose])

  // Drag the handle down to dismiss the bottom sheet (touch only).
  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return
    setDragY(Math.max(0, e.touches[0].clientY - startY.current))
  }
  const onTouchEnd = () => {
    if (dragY > DRAG_CLOSE_PX) requestClose()
    setDragY(0)
    startY.current = null
  }

  const title = formatDayLong(day)

  // Portaled to <body> with a z-index above the sticky site header (z-index 1000)
  // and the seasonal overlays, so the drawer is never clipped or covered by them.
  return createPortal(
    <div className="fixed inset-0 z-[10000]" role="presentation">
      <div
        onClick={requestClose}
        aria-hidden="true"
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${entered ? "opacity-100" : "opacity-0"}`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Events on ${title}`}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        className={`absolute bottom-0 left-0 right-0 flex max-h-[85dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out md:bottom-0 md:left-auto md:right-0 md:top-0 md:max-h-none md:w-[28rem] md:rounded-none md:rounded-l-3xl lg:w-[32rem] ${
          entered ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-y-0 md:translate-x-full"
        }`}
      >
        {/* Drag handle (mobile) */}
        <div
          className="flex shrink-0 touch-none justify-center pb-1 pt-3 md:hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <span className="h-1.5 w-10 rounded-full bg-gray-300" aria-hidden="true" />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-5 pb-4 pt-3 md:pt-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#6b2fa5]">
              {events.length} {events.length === 1 ? "event" : "events"}
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-snug text-gray-900">{title}</h2>
          </div>
          <button
            ref={closeBtn}
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {events.length > 0 ? (
            events.map((e) => <DayEventCard key={e.eventId} event={e} />)
          ) : (
            <p className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500">
              No events on this day.
            </p>
          )}
        </div>
      </aside>
    </div>,
    document.body
  )
}

export default DayDrawer
