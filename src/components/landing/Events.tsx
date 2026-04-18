"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { Calendar, MapPin, Tag, Palette, ChevronLeft, ChevronRight } from "lucide-react"
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import useSWR from "swr"
import { getLenis } from "./useLenis"

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
  themeColor?: string
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
        themeColor: d.themeColor || "#6b2fa5",
      })
    }
  })
  return events
}

const FeaturedEventSkeleton = () => (
  <div className="relative h-64 sm:h-80 lg:h-96 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 rounded-2xl overflow-hidden animate-pulse">
    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 space-y-3">
      <div className="h-6 sm:h-8 bg-gray-300/50 rounded-lg w-3/4" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-300/50 rounded w-1/2" />
        <div className="h-3 bg-gray-300/50 rounded w-2/3" />
      </div>
      <div className="h-10 bg-gray-300/50 rounded-full w-36" />
    </div>
  </div>
)

const ThemedEventSkeleton = () => (
  <div className="group rounded-2xl overflow-hidden bg-white border-2 border-gray-200 animate-pulse">
    <div className="relative h-40 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200" />
    <div className="p-3 sm:p-4 space-y-3">
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
  </div>
)

// Reveal a single element every time it enters/leaves the viewport
function useRevealOnScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Set initial hidden state without transition so there's no flash
    el.style.transition = "none"
    el.style.opacity = "0"
    el.style.transform = "translateY(40px)"

    // Allow the browser to paint the hidden state before attaching the observer
    const frameId = requestAnimationFrame(() => {
      el.style.transition = "opacity 0.65s ease, transform 0.65s ease"

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            // Scrolled into view — reveal
            el.style.opacity = "1"
            el.style.transform = "translateY(0)"
          } else {
            // Scrolled out of view — hide again so it re-animates on re-entry
            el.style.opacity = "0"
            el.style.transform = "translateY(40px)"
          }
        },
        { threshold: 0.12 }
      )

      observer.observe(el)
      // Store cleanup on the frame so the outer cleanup can call it
      ;(el as any).__revealObserver = observer
    })

    return () => {
      cancelAnimationFrame(frameId)
      const obs = (el as any).__revealObserver as IntersectionObserver | undefined
      obs?.disconnect()
    }
  }, [])

  return ref
}

// Stagger-reveal a grid of cards — re-animates every time they enter/leave
function useStaggerReveal(deps: unknown[]) {
  const ref = useRef<HTMLDivElement | null>(null)
  // Keep track of per-card observers so we can disconnect them on cleanup/re-run
  const observersRef = useRef<IntersectionObserver[]>([])

  useEffect(() => {
    const container = ref.current
    if (!container) return

    // Tear down any previous observers before re-running
    observersRef.current.forEach((obs) => obs.disconnect())
    observersRef.current = []

    const cards = Array.from(container.querySelectorAll<HTMLElement>(".themed-card"))
    if (cards.length === 0) return

    // Hide all cards immediately (no transition) so there's no flash
    cards.forEach((card) => {
      card.style.transition = "none"
      card.style.opacity = "0"
      card.style.transform = "translateY(32px)"
    })

    const frameId = requestAnimationFrame(() => {
      cards.forEach((card, i) => {
        const delay = `${i * 0.07}s`
        // Apply transition after the hidden paint
        card.style.transition = `opacity 0.55s ease ${delay}, transform 0.55s ease ${delay}`

        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              card.style.opacity = "1"
              card.style.transform = "translateY(0)"
            } else {
              // Re-hide with NO transition so the re-entry always feels fresh
              card.style.transition = "none"
              card.style.opacity = "0"
              card.style.transform = "translateY(32px)"
              // Restore transition on next frame so re-entry animates smoothly
              requestAnimationFrame(() => {
                card.style.transition = `opacity 0.55s ease ${delay}, transform 0.55s ease ${delay}`
              })
            }
          },
          { threshold: 0.1 }
        )

        observer.observe(card)
        observersRef.current.push(observer)
      })
    })

    return () => {
      cancelAnimationFrame(frameId)
      observersRef.current.forEach((obs) => obs.disconnect())
      observersRef.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}

const Events = () => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const autoRotateRef = useRef<NodeJS.Timeout | null>(null)

  const headingRef = useRevealOnScroll<HTMLHeadingElement>()
  const featuredRef = useRevealOnScroll<HTMLDivElement>()
  const themedHeadingRef = useRevealOnScroll<HTMLHeadingElement>()
  const ctaRef = useRevealOnScroll<HTMLDivElement>()

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

  const themedGridRef = useStaggerReveal([loadingThemed, themedEvents.length])

  const scrollToSection = useCallback((id: string) => {
    const lenis = getLenis()
    const target = document.getElementById(id)
    if (lenis && target) lenis.scrollTo(target)
  }, [])
  void scrollToSection

  useEffect(() => {
    if (featuredEvents.length === 0 || isHovered) return
    autoRotateRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredEvents.length)
    }, 8000)
    return () => { if (autoRotateRef.current) clearInterval(autoRotateRef.current) }
  }, [featuredEvents.length, isHovered])

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })
    } catch { return d }
  }

  const formatShortDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      })
    } catch { return d }
  }

  const currentEvent = featuredEvents[activeIndex]

  return (
    <section id="events" className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-100/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-100/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* ── Featured Events ── */}
        <div className="mb-12 sm:mb-16">
          <h2
            ref={headingRef}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-8 sm:mb-12 bg-gradient-to-r from-[#6b2fa5] via-purple-600 to-pink-500 bg-clip-text text-transparent"
          >
            Featured Events
          </h2>

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
                <div className="relative h-64 sm:h-80 lg:h-96 rounded-2xl overflow-hidden shadow-2xl">
                  {featuredEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                        index === activeIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
                      }`}
                    >
                      <div className="absolute inset-0">
                        <Image
                          src={event.imageURL || "/placeholder.svg"}
                          alt={event.eventName}
                          fill
                          className="object-cover"
                          priority={index === 0}
                          sizes="(max-width: 768px) 100vw, 90vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8 text-white">
                        <div className="max-w-2xl">
                          <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 leading-tight">
                            {event.eventName}
                          </h3>
                          <div className="space-y-2 mb-4 text-sm sm:text-base">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-purple-300" />
                              <span>{formatDate(event.eventStartDate)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-purple-300" />
                              <span className="line-clamp-1">{event.venue}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-purple-300" />
                              <span>{event.eventType}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mb-4">
                            <span className={`px-3 py-1 rounded-full font-semibold text-xs sm:text-sm ${
                              !event.freeOrPaid ? "bg-green-500 text-white" : "bg-yellow-400 text-gray-900"
                            }`}>
                              {!event.freeOrPaid ? "Free Entry" : "Paid Event"}
                            </span>
                          </div>
                          {currentEvent && (
                            <Link
                              href={`/event/${currentEvent.creatorID}/${currentEvent.eventId}`}
                              className="inline-flex items-center gap-2 px-6 py-2 sm:px-8 sm:py-3 bg-gradient-to-r from-[#6b2fa5] to-purple-600 text-white rounded-full font-semibold text-sm sm:text-base transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
                            >
                              View Details
                              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                              </svg>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {featuredEvents.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveIndex((p) => (p === 0 ? featuredEvents.length - 1 : p - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all duration-300 group"
                        aria-label="Previous"
                      >
                        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform" />
                      </button>
                      <button
                        onClick={() => setActiveIndex((p) => (p + 1) % featuredEvents.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 transition-all duration-300 group"
                        aria-label="Next"
                      >
                        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform" />
                      </button>
                    </>
                  )}
                </div>

                {featuredEvents.length > 1 && (
                  <div className="flex justify-center gap-2 mt-4 sm:mt-6">
                    {featuredEvents.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveIndex(index)}
                        className={`transition-all duration-300 rounded-full ${
                          index === activeIndex
                            ? "w-10 h-2 sm:w-12 sm:h-3 bg-gradient-to-r from-[#6b2fa5] to-purple-600"
                            : "w-2 h-2 sm:w-3 sm:h-3 bg-gray-300 hover:bg-gray-400"
                        }`}
                        aria-label={`Go to event ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-64 sm:h-80 lg:h-96 bg-gray-100 rounded-2xl">
                <p className="text-gray-500 text-base sm:text-lg">No featured events available at the moment.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Themed Events ── */}
        <div>
          <h3
            ref={themedHeadingRef}
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center mb-8 sm:mb-12 text-gray-800"
          >
            Themed Events
          </h3>

          <div
            ref={themedGridRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12"
          >
            {loadingThemed ? (
              Array(8).fill(0).map((_, i) => <ThemedEventSkeleton key={i} />)
            ) : themedEvents.length > 0 ? (
              themedEvents.map((event) => (
                <Link
                  href={`/event/${event.creatorID}/${event.eventId}`}
                  key={event.id}
                  className="themed-card group rounded-2xl overflow-hidden bg-white border-2 hover:border-transparent transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
                  style={{ borderColor: event.themeColor || "#6b2fa5" }}
                >
                  <div className="relative h-36 sm:h-40 overflow-hidden">
                    <Image
                      src={event.imageURL || "/placeholder.svg"}
                      alt={event.eventName}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        background: `linear-gradient(45deg, ${event.themeColor || "#6b2fa5"}40, ${event.themeColor || "#6b2fa5"}20)`,
                      }}
                    />
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                      <div
                        className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-white text-xs font-semibold shadow-lg"
                        style={{ backgroundColor: event.themeColor || "#6b2fa5" }}
                      >
                        <Palette className="w-3 h-3" />
                        <span className="hidden sm:inline">{event.theme}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4">
                    <h4 className="font-bold text-sm sm:text-base mb-2 text-gray-800 line-clamp-2 group-hover:text-purple-600 transition-colors">
                      {event.eventName}
                    </h4>
                    <div className="space-y-1 mb-3 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                        <span>{formatShortDate(event.eventStartDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                        <span className="line-clamp-1 text-xs">{event.eventType}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      !event.freeOrPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {!event.freeOrPaid ? "Free" : "Paid"}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="flex items-center justify-center h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-xs sm:text-sm">No events available</p>
              </div>
            )}
          </div>

          <div ref={ctaRef} className="text-center">
            <Link
              href="/home"
              className="inline-flex items-center gap-2 px-6 sm:px-10 py-2 sm:py-4 bg-gradient-to-r from-[#6b2fa5] to-purple-600 text-white rounded-full font-semibold text-sm sm:text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50"
            >
              View All Events
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Events