"use client"

import Link from "next/link"
import { Calendar, MapPin } from "lucide-react"
import { NotchedArrows } from "@/components/NotchedArrows"
import { useCarousel } from "@/hooks/useCarousel"
import { FEATURED_AUTOPLAY_MS } from "../constants"
import { eventHref, formatEventDate, hasPassed, optimizeImage } from "../lib/format"
import type { FeaturedEvent } from "../types"

interface FeaturedBannerProps {
  events: FeaturedEvent[]
  loading: boolean
}

const FRAME = "relative overflow-hidden rounded-3xl bg-neutral-900 aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]"

export function FeaturedBannerSkeleton() {
  return <div className={`${FRAME} animate-pulse bg-gray-200`} />
}

function Slide({ event, active, first }: { event: FeaturedEvent; active: boolean; first: boolean }) {
  const isFree = !event.freeOrPaid
  const ended = hasPassed(event.eventStartDate)

  return (
    <Link
      href={eventHref(event.eventId)}
      prefetch={false}
      aria-hidden={!active}
      tabIndex={active ? 0 : -1}
      className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
        active ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <img
        src={optimizeImage(event.imageURL, 1600)}
        alt={event.eventName}
        className="absolute inset-0 h-full w-full object-cover object-[center_30%]"
        loading={first ? "eager" : "lazy"}
        fetchPriority={first ? "high" : "auto"}
        decoding="async"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      <div className="absolute left-4 top-4 flex gap-2 sm:left-6 sm:top-6">
        <span className="rounded-full bg-[#6b2fa5] px-3 py-1.5 text-xs font-medium text-white">Featured</span>
        {isFree && (
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-900">Free</span>
        )}
        {ended && (
          <span className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white">Ended</span>
        )}
      </div>

      {/* Bottom padding leaves room for the notch on small screens */}
      <div className="absolute inset-x-0 bottom-0 px-4 pb-[72px] text-white sm:px-6 lg:max-w-[36%] lg:pb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-medium">
          <Calendar size={12} aria-hidden="true" />
          {formatEventDate(event.eventStartDate)}
        </span>
        <h2 className="mt-3 line-clamp-2 text-xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {event.eventName}
        </h2>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-white/85">
          <MapPin size={14} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{event.venue}</span>
        </p>
      </div>
    </Link>
  )
}

export default function FeaturedBanner({ events, loading }: FeaturedBannerProps) {
  const { index, next, prev, bind } = useCarousel(events.length, { autoplayMs: FEATURED_AUTOPLAY_MS })

  if (loading) return <FeaturedBannerSkeleton />
  if (events.length === 0) return null

  return (
    <section aria-label="Featured events" aria-roledescription="carousel">
      <div {...bind} className={FRAME}>
        {events.map((event, i) => (
          <Slide key={event.id} event={event} active={i === index} first={i === 0} />
        ))}
        {events.length > 1 && (
          <NotchedArrows
            onPrev={prev}
            onNext={next}
            prevLabel="Previous featured event"
            nextLabel="Next featured event"
          />
        )}
      </div>
    </section>
  )
}
