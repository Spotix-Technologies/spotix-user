"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Calendar, Clock, MapPin } from "lucide-react"
import { eventHref, formatEventDate, optimizeImage } from "../lib/format"
import type { HomeEvent } from "../types"

interface EventRowProps {
  event: HomeEvent
  past?: boolean
}

export function EventRowSkeleton() {
  return (
    <div className="flex animate-pulse gap-4 rounded-3xl border border-gray-100 p-3 sm:p-4">
      <div className="h-24 w-24 shrink-0 rounded-2xl bg-gray-200 sm:h-32 sm:w-40" />
      <div className="flex-1 space-y-3 py-1">
        <div className="h-5 w-40 rounded-full bg-gray-200" />
        <div className="h-5 w-3/4 rounded bg-gray-200" />
        <div className="h-4 w-1/2 rounded bg-gray-200" />
      </div>
    </div>
  )
}

const pill = "inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700"

const EventRow: React.FC<EventRowProps> = ({ event, past = false }) => {
  const [failed, setFailed] = useState(false)
  const isFree = !event.freeOrPaid
  const action = past ? "View" : isFree ? "Register" : "Buy Tickets"

  return (
    <Link
      href={eventHref(event.eventId)}
      prefetch={false}
      className={`group flex gap-4 rounded-3xl border border-gray-200 bg-white p-3 transition hover:border-gray-300 hover:shadow-sm sm:p-4 ${
        past ? "opacity-80" : ""
      }`}
    >
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-gray-100 sm:h-32 sm:w-40">
        {!failed ? (
          <img
            src={optimizeImage(event.eventImage, 400, 320)}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              past ? "grayscale-[40%]" : ""
            }`}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-gray-400">No image</div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={pill}>
              <Calendar size={12} aria-hidden="true" />
              {formatEventDate(event.eventStartDate)}
            </span>
            {event.eventStart && (
              <span className={pill}>
                <Clock size={12} aria-hidden="true" />
                {event.eventStart}
              </span>
            )}
            {isFree && !past && (
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">Free</span>
            )}
            {past && <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">Past</span>}
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-gray-900 sm:text-lg">
            {event.eventName}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-500">
            <MapPin size={14} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{event.venue}</span>
            {event.eventType && <span className="hidden shrink-0 text-gray-400 sm:inline">· {event.eventType}</span>}
          </p>
        </div>

        <div className="hidden shrink-0 self-stretch border-l border-gray-200 pl-6 sm:flex sm:items-center">
          <span className="rounded-full border border-[#6b2fa5] px-4 py-1.5 text-sm font-medium text-[#6b2fa5] transition-colors group-hover:bg-[#6b2fa5] group-hover:text-white">
            {action}
          </span>
        </div>
      </div>
    </Link>
  )
}

export default EventRow
