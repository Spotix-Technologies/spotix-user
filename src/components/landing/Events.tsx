"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Calendar, MapPin, Tag, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react"
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import useSWR from "swr"
import { UI } from "./theme"
import { optimizeImage } from "@/app/home/lib/format"

interface FeaturedEvent {
  id: string
  eventName: string
  imageURL: string
  eventType: string
  venue: string
  eventStartDate: string
  freeOrPaid: boolean
  creatorID: string
  eventId: string
  bookerName: string
}

interface ThemedEvent extends FeaturedEvent {
  theme: string
}

const fetchFeaturedEvents = async (): Promise<FeaturedEvent[]> => {
  const featuredQuery = query(collection(db, "featuredEvents"), orderBy("addedAt", "desc"), limit(5))
  const featuredSnapshot = await getDocs(featuredQuery)
  if (featuredSnapshot.empty) return []
  const events: FeaturedEvent[] = []
  featuredSnapshot.docs.forEach((doc) => {
    const d = doc.data()
    if (d.eventId && d.creatorID) {
      events.push({
        id: doc.id,
        eventName: d.eventName,
        imageURL: d.imageURL,
        eventType: d.eventType,
        venue: d.venue,
        eventStartDate: d.eventStartDate,
        freeOrPaid: d.freeOrPaid,
        creatorID: d.creatorID,
        eventId: d.eventId,
        bookerName: d.bookerName || "Event Organizer",
      })
    }
  })
  return events
}

const fetchThemedEvents = async (): Promise<ThemedEvent[]> => {
  const themedQuery = query(collection(db, "themedEvents"), orderBy("addedAt", "desc"), limit(8))
  const themedSnapshot = await getDocs(themedQuery)
  if (themedSnapshot.empty) return []
  const events: ThemedEvent[] = []
  themedSnapshot.docs.forEach((doc) => {
    const d = doc.data()
    if (d.eventId && d.creatorID) {
      events.push({
        id: doc.id,
        eventName: d.eventName,
        imageURL: d.imageURL,
        eventType: d.eventType,
        venue: d.venue,
        eventStartDate: d.eventStartDate,
        freeOrPaid: d.freeOrPaid,
        creatorID: d.creatorID,
        eventId: d.eventId,
        bookerName: d.bookerName || "Event Organizer",
        theme: d.theme || "Featured",
      })
    }
  })
  return events
}

const FeaturedEventSkeleton = () => (
  <div className="relative h-64 sm:h-80 lg:h-96 bg-[#f5f0fb] rounded-2xl overflow-hidden animate-pulse">
    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-3">
      <div className="h-6 sm:h-8 bg-white/60 rounded-lg w-3/4" />
      <div className="space-y-2">
        <div className="h-3 bg-white/60 rounded w-1/2" />
        <div className="h-3 bg-white/60 rounded w-2/3" />
      </div>
      <div className="h-10 bg-white/60 rounded-full w-36" />
    </div>
  </div>
)

const ThemedEventSkeleton = () => (
  <div className="rounded-2xl overflow-hidden bg-white border border-[#ece7f1] animate-pulse">
    <div className="h-40 bg-[#f5f0fb]" />
    <div className="p-4 space-y-3">
      <div className="h-5 bg-[#f0ecf5] rounded w-3/4" />
      <div className="h-3 bg-[#f0ecf5] rounded w-1/2" />
    </div>
  </div>
)

// Reveal a single element when it scrolls into view
function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.style.transition = "none"
    el.style.opacity = "0"
    el.style.transform = "translateY(24px)"

    let observer: IntersectionObserver | undefined
    const frameId = requestAnimationFrame(() => {
      el.style.transition = "opacity 0.6s ease, transform 0.6s ease"
      observer = new IntersectionObserver(
        ([entry]) => {
          el.style.opacity = entry.isIntersecting ? "1" : "0"
          el.style.transform = entry.isIntersecting ? "translateY(0)" : "translateY(24px)"
        },
        { threshold: 0.12 }
      )
      observer.observe(el)
    })

    return () => {
      cancelAnimationFrame(frameId)
      observer?.disconnect()
    }
  }, [])

  return ref
}

const Events = () => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null)

  const headingRef = useRevealOnScroll<HTMLDivElement>()
  const featuredRef = useRevealOnScroll<HTMLDivElement>()
  const themedHeadingRef = useRevealOnScroll<HTMLHeadingElement>()

  const { data: featuredEvents = [], isLoading: loadingFeatured } = useSWR(
    "featuredEvents",
    fetchFeaturedEvents,
    { revalidateOnFocus: true, dedupingInterval: 10 * 60 * 1000 }
  )
  const { data: themedEvents = [], isLoading: loadingThemed } = useSWR(
    "themedEvents",
    fetchThemedEvents,
    { revalidateOnFocus: true, dedupingInterval: 10 * 60 * 1000 }
  )

  useEffect(() => {
    if (featuredEvents.length === 0 || isHovered) return
    autoRotateRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredEvents.length)
    }, 8000)
    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current)
    }
  }, [featuredEvents.length, isHovered])

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    } catch {
      return d
    }
  }

  const formatShortDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return d
    }
  }

  return (
    <section id="events" className={`relative scroll-mt-20 py-20 sm:py-24 ${UI.bandWhite}`}>
      <div className={`${UI.container} relative z-10`}>
        {/* ── Featured Events ── */}
        <div className="mb-16 sm:mb-20">
          <div ref={headingRef} className="mb-10 sm:mb-12">
            <p className={`${UI.eyebrow} mb-3`}>Happening now</p>
            <h2 className={UI.h2}>Featured events</h2>
          </div>

          <div
            ref={featuredRef}
            className="relative"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {loadingFeatured ? (
              <FeaturedEventSkeleton />
            ) : featuredEvents.length > 0 ? (
              <>
                <div className="relative h-72 sm:h-80 lg:h-[26rem] rounded-3xl overflow-hidden">
                  {featuredEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                        index === activeIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
                      }`}
                    >
                      <div className="absolute inset-0">
                        {/* Plain <img> (same as the /home page): event images come from
                            arbitrary hosts, which next/image rejects unless each is
                            whitelisted in next.config. */}
                        <img
                          src={optimizeImage(event.imageURL, 1600)}
                          alt={event.eventName}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading={index === 0 ? "eager" : "lazy"}
                          fetchPriority={index === 0 ? "high" : "auto"}
                          decoding="async"
                          onError={(e) => {
                            const img = e.currentTarget
                            if (!img.src.endsWith("/placeholder.svg")) img.src = "/placeholder.svg"
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#171123] via-[#171123]/50 to-transparent" />
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 lg:p-8 text-white">
                        <div className="max-w-2xl">
                          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 leading-tight">
                            {event.eventName}
                          </h3>
                          <div className="space-y-2 mb-4 text-sm sm:text-base">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#e4d6f5]" />
                              <span>{formatDate(event.eventStartDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[#e4d6f5]" />
                              <span className="line-clamp-1">{event.venue}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-[#e4d6f5]" />
                              <span>{event.eventType}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <span
                              className={`px-3 py-1 rounded-full font-semibold text-xs sm:text-sm ${
                                !event.freeOrPaid ? "bg-[#16a34a] text-white" : "bg-[#6b2fa5] text-white"
                              }`}
                            >
                              {!event.freeOrPaid ? "Free Entry" : "Paid Event"}
                            </span>
                          </div>
                          <Link
                            href={`/event/${event.eventId}`}
                            className="inline-flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 bg-white text-[#171123] rounded-full font-semibold text-sm sm:text-base transition-colors duration-200 hover:bg-[#f7f6f9]"
                          >
                            View Details
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}

                  {featuredEvents.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveIndex((p) => (p === 0 ? featuredEvents.length - 1 : p - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all duration-300"
                        aria-label="Previous"
                      >
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </button>
                      <button
                        onClick={() => setActiveIndex((p) => (p + 1) % featuredEvents.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all duration-300"
                        aria-label="Next"
                      >
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </button>
                    </>
                  )}
                </div>

                {featuredEvents.length > 1 && (
                  <div className="flex justify-center gap-2 mt-5 sm:mt-6">
                    {featuredEvents.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveIndex(index)}
                        className={`transition-all duration-300 rounded-full ${
                          index === activeIndex ? "w-9 h-2 bg-[#6b2fa5]" : "w-2 h-2 bg-[#e4d6f5] hover:bg-[#c9aee5]"
                        }`}
                        aria-label={`Go to event ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-64 sm:h-80 lg:h-96 bg-[#faf9fb] rounded-2xl border border-dashed border-[#e4d6f5]">
                <p className="text-[#7c7389] text-base">No featured events available at the moment.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Themed Events ── */}
        <div>
          <h3 ref={themedHeadingRef} className="mb-8 text-2xl sm:text-3xl font-bold tracking-tight text-[#171123]">
            Themed events
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 mb-10">
            {loadingThemed
              ? Array(8)
                  .fill(0)
                  .map((_, i) => <ThemedEventSkeleton key={i} />)
              : themedEvents.length > 0
              ? themedEvents.map((event) => (
                  <Link
                    href={`/event/${event.eventId}`}
                    key={event.id}
                    className="group rounded-2xl overflow-hidden bg-white border border-[#ece7f1] hover:border-[#171123]/25 hover:shadow-[0_12px_32px_-16px_rgba(23,17,35,0.25)] transition-all duration-300"
                  >
                    <div className="relative h-36 sm:h-40 overflow-hidden">
                      <img
                        src={optimizeImage(event.imageURL, 600, 320)}
                        alt={event.eventName}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const img = e.currentTarget
                          if (!img.src.endsWith("/placeholder.svg")) img.src = "/placeholder.svg"
                        }}
                      />
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full bg-[#171123]/70 backdrop-blur-sm text-white text-xs font-semibold">
                          {event.theme}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <h4 className="font-bold text-sm sm:text-base mb-2 text-[#171123] line-clamp-2 group-hover:text-[#6b2fa5] transition-colors">
                        {event.eventName}
                      </h4>
                      <div className="space-y-1 mb-3 text-xs sm:text-sm text-[#7c7389]">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatShortDate(event.eventStartDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5" />
                          <span className="line-clamp-1">{event.eventType}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          !event.freeOrPaid ? "bg-[#dcfce7] text-[#16a34a]" : "bg-[#f5f0fb] text-[#6b2fa5]"
                        }`}
                      >
                        {!event.freeOrPaid ? "Free" : "Paid"}
                      </span>
                    </div>
                  </Link>
                ))
              : (
                <div className="col-span-full flex items-center justify-center h-48 bg-[#faf9fb] rounded-2xl border border-dashed border-[#e4d6f5]">
                  <p className="text-[#7c7389] text-sm">No events available</p>
                </div>
              )}
          </div>

          <div className="text-center">
            <Link
              href="/home"
              className={UI.btnPrimary}
            >
              View All Events
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Events
