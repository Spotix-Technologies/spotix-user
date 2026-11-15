"use client"

import { useMemo, useState, type ReactNode } from "react"
import { CalendarPlus, MapPin, ShieldCheck, User } from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import type { EventType } from "../page"
import { EventImageSection } from "./event-image-section"
import { Countdown } from "./countdown"
import {
  buildGoogleCalendarUrl,
  formatShortDate,
  formatTime12,
  getEventEnd,
  getEventStart,
} from "../lib/event-datetime"
import { getStartingPrice } from "../lib/pricing"

interface EventHeroProps {
  eventData: EventType
  isEventToday: boolean
  isSoldOut: boolean
  isSaleEnded: boolean
  /** Breadcrumb + account actions row */
  topBar: ReactNode
  /** Primary call-to-action (already wired up by the page) */
  cta: ReactNode
}

/**
 * Full-bleed dark hero: the poster doubles as a blurred backdrop (and follows the
 * carousel as it changes), with the title, live countdown and CTA over it and the
 * crisp poster framed on the right.
 */
export function EventHero({ eventData, isEventToday, isSoldOut, isSaleEnded, topBar, cta }: EventHeroProps) {
  const [backdrop, setBackdrop] = useState(eventData.eventImage || eventData.eventImages?.[0] || "")

  const start = useMemo(() => getEventStart(eventData), [eventData])
  const end = useMemo(() => getEventEnd(eventData), [eventData])
  const startingPrice = getStartingPrice(eventData)

  const dateLine = start ? formatShortDate(start) : eventData.eventDate
  const timeLine = eventData.eventStart ? formatTime12(eventData.eventStart) : null

  const calendarUrl = start
    ? buildGoogleCalendarUrl({
        title: eventData.eventName,
        start,
        end,
        location: eventData.eventVenue,
        details: eventData.eventDescription?.slice(0, 500),
      })
    : null

  const badge = isSoldOut
    ? { text: "Sold out", cls: "border-red-300/30 bg-red-500/20 text-red-100" }
    : isSaleEnded
      ? { text: "Sales ended", cls: "border-amber-300/30 bg-amber-400/20 text-amber-100" }
      : isEventToday
        ? { text: "Today", cls: "border-emerald-300/30 bg-emerald-400/20 text-emerald-100" }
        : null

  return (
    <section id="top" className="relative isolate overflow-hidden bg-[#0d0818] text-white">
      {/* Backdrop */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        {backdrop && (
          <img
            src={backdrop}
            alt=""
            decoding="async"
            className="h-full w-full scale-125 object-cover opacity-60 blur-3xl saturate-150 transition-opacity duration-700"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d0818]/70 via-[#0d0818]/55 to-[#0d0818]" />
        <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_15%_35%,rgba(107,47,165,0.35),transparent)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-4">{topBar}</div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-12 pt-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-16 lg:pb-20 lg:pt-12">
        {/* Poster — first on mobile so the flyer is the first thing seen */}
        <div className="order-1 mx-auto w-full max-w-sm lg:order-2 lg:max-w-md">
          <div className="rounded-[2rem] bg-white p-2.5 shadow-[0_40px_90px_-25px_rgba(0,0,0,0.85)] ring-1 ring-white/20 sm:p-3 lg:rotate-[1.5deg] lg:transition-transform lg:duration-500 lg:hover:rotate-0">
            <EventImageSection
              eventImages={eventData.eventImages}
              eventName={eventData.eventName}
              eventImage={eventData.eventImage}
              aspectClass="aspect-[4/5]"
              onActiveImageChange={setBackdrop}
              showFullscreenIcon
            />
          </div>
        </div>

        {/* Copy */}
        <div className="order-2 min-w-0 lg:order-1">
          <div className="flex flex-wrap items-center gap-2">
            {eventData.eventType && (
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-md">
                {eventData.eventType}
              </span>
            )}
            {badge && (
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-md ${badge.cls}`}>
                {badge.text}
              </span>
            )}
          </div>

          <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold tracking-[0.18em] text-white">
            <span aria-hidden="true" className="hidden h-px w-10 bg-white/50 sm:block" />
            <span>
              {dateLine}
              {timeLine && ` · ${timeLine}`}
            </span>
            {eventData.bookerName && (
              <>
                <span aria-hidden="true" className="font-normal text-white/30">
                  /
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium normal-case tracking-normal text-white/80">
                  <User size={14} aria-hidden="true" />
                  {eventData.bookerName}
                </span>
              </>
            )}
            {calendarUrl && (
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium normal-case tracking-normal text-white/70 transition-colors hover:text-white"
              >
                <CalendarPlus size={14} aria-hidden="true" />
                Add to calendar
              </a>
            )}
          </p>

          <h1 className="mt-4 text-balance text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl">
            {eventData.eventName}
          </h1>

          {eventData.eventVenue && (
            <a
              href="#location"
              className="mt-4 inline-flex max-w-full items-center gap-2 text-base text-white/70 transition-colors hover:text-white"
            >
              <MapPin size={16} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{eventData.eventVenue}</span>
            </a>
          )}

          <div className="mt-8">
            <Countdown start={start} end={end} />
          </div>

          <div className="mt-8 hidden flex-wrap items-center gap-x-6 gap-y-4 lg:flex">
            {cta}
            <span className="inline-flex items-center gap-2 text-sm text-white/60">
              <ShieldCheck size={16} aria-hidden="true" />
              Secure payment
            </span>
            {startingPrice !== null && (
              <span className="text-sm text-white/60">
                {startingPrice === 0 ? "Free entry" : `From ₦${formatNumber(startingPrice)}`}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
