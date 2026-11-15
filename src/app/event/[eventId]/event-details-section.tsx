"use client"

import React, { useState } from "react"
import { AlertCircle, Calendar, Clock, Heart, MapPin, Share2, Tag } from "lucide-react"
import type { EventType } from "./page"
import { Reveal } from "./components/reveal"
import { SectionHeading } from "./components/section-heading"
import { formatLongDate, formatTime12, getEventStart } from "./lib/event-datetime"

interface EventDetailsSectionProps {
  eventData: EventType
  eventUrl: string
  isLiked: boolean
  likeCount: number
  isLiking: boolean
  isSoldOut: boolean
  onToggleLike: () => void
}

const CLAMP_AT = 420 // characters — longer descriptions get a "Read more" toggle

/** "About this event": description, at-a-glance detail tiles, like + share. */
const EventDetailsSection: React.FC<EventDetailsSectionProps> = ({
  eventData,
  eventUrl,
  isLiked,
  likeCount,
  isLiking,
  isSoldOut,
  onToggleLike,
}) => {
  const [expanded, setExpanded] = useState(false)

  const handleShare = async () => {
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: eventData.eventName,
          text: `Check out this event: ${eventData.eventName}`,
          url: eventUrl,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(eventUrl)
      alert("Event link copied to clipboard!")
    }
  }

  const start = getEventStart(eventData)
  const description = eventData.eventDescription?.trim() ?? ""
  const isLong = description.length > CLAMP_AT

  const facts = [
    { icon: Calendar, label: "Date", value: start ? formatLongDate(start) : eventData.eventDate },
    eventData.eventStart
      ? {
          icon: Clock,
          label: "Time",
          value: `${formatTime12(eventData.eventStart)}${eventData.eventEnd ? ` – ${formatTime12(eventData.eventEnd)}` : ""}`,
        }
      : null,
    eventData.eventVenue ? { icon: MapPin, label: "Venue", value: eventData.eventVenue } : null,
    eventData.eventType ? { icon: Tag, label: "Category", value: eventData.eventType } : null,
  ].filter((f): f is { icon: typeof Calendar; label: string; value: string } => f !== null)

  const action =
    "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"

  return (
    <section id="about" className="scroll-mt-32">
      <Reveal>
        <SectionHeading kicker="The event" title="About this" accent="event." />
      </Reveal>

      {isSoldOut && (
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle size={20} className="shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-700">This event is sold out</p>
        </div>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <Reveal>
          {description ? (
            <div>
              <p
                className={`whitespace-pre-line text-pretty text-lg leading-relaxed text-gray-600 ${
                  isLong && !expanded ? "line-clamp-6" : ""
                }`}
              >
                {description}
              </p>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-3 text-sm font-semibold text-[#6b2fa5] underline underline-offset-4 hover:text-[#58248a]"
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-lg text-gray-500">The organizer hasn&apos;t added a description yet.</p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onToggleLike}
              disabled={isLiking}
              className={`${action} disabled:cursor-not-allowed disabled:opacity-50 ${
                isLiked
                  ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  : "border-gray-300 text-[#171123] hover:border-[#171123]"
              }`}
            >
              <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
              {likeCount} {likeCount === 1 ? "Like" : "Likes"}
            </button>
            <button type="button" onClick={handleShare} className={`${action} border-gray-300 text-[#171123] hover:border-[#171123]`}>
              <Share2 size={16} />
              Share
            </button>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#6b2fa5] shadow-sm ring-1 ring-gray-200">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</dt>
                  <dd className="mt-0.5 break-words font-semibold text-[#171123]">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  )
}

export default EventDetailsSection
