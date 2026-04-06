"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import {
  getSessionUser,
  authFetch,
  logout,
  type SessionUser,
} from "@/app/lib/auth-client"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import { ArrowLeft, Ticket, X, Wallet, Maximize2, AlertCircle, Flag } from "lucide-react"
import LoginButton from "@/components/LoginButton"
import EventDetailsSection from "./event-details-section"
import LocationSection from "./location-section"
import ReviewsSection from "./reviews-section"
import BookerDetailsSection from "./booker-details-section"
import BuyTicketDialog from "./buy-ticket-dialog"
import MerchSection from "./merch-section"
import { formatNumber } from "@/utils/formatter"
import { ReportModal } from "./report-modal"
import { ImageCarousel } from "./image-carousel"

import type { EventType } from "./page"

interface ClientPageProps {
  params: {
    creatorId: string
    eventId: string
  }
  initialEventData?: EventType | null
}

// ── LazyImage ─────────────────────────────────────────────────────────────────

const LazyImage: React.FC<{
  src: string
  alt: string
  className?: string
  eventName?: string
  showFullscreenIcon?: boolean
}> = ({ src, alt, className, showFullscreenIcon = false }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const imgSrc = src || "/placeholder.svg"

  return (
    <>
      <div className={`relative group ${className || ""}`}>
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
            <div className="w-16 h-16 bg-gray-300 rounded-full animate-pulse" />
          </div>
        )}
        <img
          src={imgSrc}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => { setHasError(true); setIsLoaded(true) }}
          className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
        {showFullscreenIcon && isLoaded && !hasError && (
          <button
            onClick={() => setShowFullscreen(true)}
            className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full transition-all duration-200 hover:bg-opacity-70 hover:scale-110"
            aria-label="View fullscreen"
          >
            <Maximize2 size={20} />
          </button>
        )}
        {hasError && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">Failed to load image</span>
          </div>
        )}
      </div>

      {showFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50">
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-1/2 -translate-y-1/2 right-4 bg-white hover:bg-gray-100 text-gray-900 p-4 rounded-full transition-all duration-200 shadow-2xl border-2 border-gray-200"
            style={{ zIndex: 9999 }}
            aria-label="Close fullscreen"
          >
            <X size={28} />
          </button>
          <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
            <img
              src={imgSrc}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  )
}

// ── Skeleton / Preloader ──────────────────────────────────────────────────────

const EventSkeleton = () => (
  <div className="max-w-7xl mx-auto p-4">
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-10 w-10 bg-gray-200 rounded-full" />
        <div className="h-8 w-32 bg-gray-200 rounded-md" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-96 w-full bg-gray-200 rounded-lg" />
          <div className="h-64 w-full bg-gray-200 rounded-lg" />
        </div>
        <div className="space-y-6">
          <div className="h-64 w-full bg-gray-200 rounded-lg" />
          <div className="h-48 w-full bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
)

const Preloader = () => (
  <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
    <div className="text-center">
      <img src="/preloader.gif" alt="Loading..." className="w-24 h-24 mx-auto mb-4" />
      <p className="text-[#6b2fa5] font-medium">Loading event details...</p>
    </div>
  </div>
)

// ── ClientPage ────────────────────────────────────────────────────────────────

export default function ClientPage({ params, initialEventData }: ClientPageProps) {
  const { creatorId, eventId } = params
  const router = useRouter()

  // Event data
  const [eventData, setEventData] = useState<EventType | null>(initialEventData || null)
  const [loading, setLoading] = useState(!initialEventData)

  // Auth — driven by getSessionUser() (Spotix JWT), NOT Firebase onAuthStateChanged
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // User display data — fetched separately from Firestore after auth resolves
  const [username, setUsername] = useState("")
  const [walletBalance, setWalletBalance] = useState<number>(0)

  // Event status
  const [isSoldOut, setIsSoldOut] = useState(false)
  const [isSaleEnded, setIsSaleEnded] = useState(false)
  const [isEventPassed, setIsEventPassed] = useState(false)
  const [isEventToday, setIsEventToday] = useState(false)

  // Booker
  const [bookerDetails, setBookerDetails] = useState<{
    username: string
    email: string
    phone: string
    isVerified: boolean
  } | null>(null)

  // Likes — API-only, no client Firestore SDK
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(initialEventData?.likeCount || 0)
  const [isLiking, setIsLiking] = useState(false)

  // UI
  const [eventUrl, setEventUrl] = useState("")
  const [showPassedDialog, setShowPassedDialog] = useState(false)
  const [showBuyTicketDialog, setShowBuyTicketDialog] = useState(false)
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  // footerRef kept for any future use; no longer drives button positioning
  const footerRef = useRef<HTMLDivElement>(null)
  const bookerDetailsRef = useRef<HTMLDivElement>(null)

  // Stable cache key — outside render so useEffect deps don't fluctuate
  const cacheKey = `event_${eventId}_${creatorId}`
  const CACHE_TTL = 5 * 60 * 1000

  // ── Auth check (single source of truth: Spotix JWT via /api/v1/auth) ────────

  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      const user = await getSessionUser()
      if (cancelled) return
      setSessionUser(user)
      setIsAuthenticated(!!user)
      setAuthChecked(true)
    }

    checkAuth()
    return () => { cancelled = true }
  }, [])

  // ── Fetch user display data after auth resolves ───────────────────────────

  useEffect(() => {
    if (!sessionUser?.uid) return

    const fetchUserDisplay = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", sessionUser.uid))
        if (userDoc.exists()) {
          const d = userDoc.data()
          setUsername(d.username || "User")
          setWalletBalance(d.walletBalance || 0)
        }
      } catch (error) {
        console.error("Error fetching user display data:", error)
      }
    }

    fetchUserDisplay()
  }, [sessionUser?.uid])

  // ── Fetch like status ────────────────────────────────────────────────────

  useEffect(() => {
    if (!authChecked || !sessionUser?.uid || !eventId) return

    const checkLikeStatus = async () => {
      try {
        const res = await fetch(`/api/v1/event/likes?eventId=${eventId}`, {
          credentials: "same-origin",
        })
        if (res.ok) {
          const result = await res.json()
          setIsLiked(result.liked ?? false)
        }
      } catch (error) {
        console.error("Error checking like status:", error)
      }
    }

    checkLikeStatus()
  }, [authChecked, sessionUser?.uid, eventId])

  // ── Fetch event data (only when no SSR data) ──────────────────────────────

  useEffect(() => {
    if (initialEventData) {
      setLikeCount(initialEventData.likeCount || 0)
      return
    }

    const fetchEventData = async () => {
      try {
        const cached = sessionStorage.getItem(cacheKey)
        if (cached) {
          const { data, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_TTL) {
            setEventData(data)
            setLikeCount(data.likeCount || 0)
            setLoading(false)
            return
          }
        }

        const response = await fetch(`/api/v1/event?eventId=${eventId}`)
        if (!response.ok) { router.push("/404"); return }

        const result = await response.json()
        if (!result.success) { router.push("/404"); return }

        const data = result.data as EventType
        setEventData(data)
        setLikeCount(data.likeCount || 0)
        sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }))
      } catch (error) {
        console.error("Error fetching event data:", error)
        router.push("/404")
      } finally {
        setLoading(false)
      }
    }

    fetchEventData()
  }, [eventId, router, cacheKey, CACHE_TTL, initialEventData])

  // ── Fetch booker details ──────────────────────────────────────────────────

  useEffect(() => {
    if (!eventData?.createdBy) return

    const fetchBookerDetails = async () => {
      try {
        const response = await fetch(`/api/v1/event/creator?creatorId=${eventData.createdBy}`)
        if (!response.ok) return
        const result = await response.json()
        if (result.success) setBookerDetails(result.data)
      } catch (error) {
        console.error("Error fetching booker details:", error)
      }
    }

    fetchBookerDetails()
  }, [eventData?.createdBy])

  // ── Body scroll lock when buy dialog is open ──────────────────────────────

  useEffect(() => {
    document.body.style.overflow = showBuyTicketDialog ? "hidden" : "unset"
    return () => { document.body.style.overflow = "unset" }
  }, [showBuyTicketDialog])

  // ── Event URL ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window !== "undefined") setEventUrl(window.location.href)
  }, [])

  // ── Event status flags ────────────────────────────────────────────────────

  useEffect(() => {
    if (!eventData) return
    const now = new Date()
    const eventDate = new Date(eventData.eventDate)
    const eventEndDate = new Date(eventData.eventEndDate)

    setIsEventToday(
      now.getDate() === eventDate.getDate() &&
        now.getMonth() === eventDate.getMonth() &&
        now.getFullYear() === eventDate.getFullYear()
    )
    setIsEventPassed(now > eventEndDate)

    if (eventData.enableMaxSize && eventData.maxSize)
      setIsSoldOut((eventData.ticketsSold || 0) >= parseInt(eventData.maxSize))

    if (eventData.enableStopDate && eventData.stopDate)
      setIsSaleEnded(now > new Date(eventData.stopDate))
  }, [eventData])

  // ── Page loaded ───────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => setIsPageLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  // ── hasEventEnded ─────────────────────────────────────────────────────────

  const hasEventEnded = useCallback(() => {
    if (!eventData?.eventEndDate) return false
    const now = new Date()
    const endDate = new Date(eventData.eventEndDate)
    if (eventData.eventEnd) {
      const [h, m] = eventData.eventEnd.split(":").map(Number)
      endDate.setHours(h || 0, m || 0)
    }
    return now > endDate
  }, [eventData])

  // ── Toggle like ───────────────────────────────────────────────────────────

  const handleToggleLike = async () => {
    if (!isAuthenticated) {
      alert("Please login to like this event")
      return
    }
    if (isLiking) return

    setIsLiking(true)

    const prevLiked = isLiked
    const prevCount = likeCount
    setIsLiked(!isLiked)
    setLikeCount((prev) => (isLiked ? Math.max(0, prev - 1) : prev + 1))

    try {
      const res = await authFetch("/api/v1/event/likes", {
        method: "POST",
        body: JSON.stringify({ eventId, action: isLiked ? "unlike" : "like" }),
      })

      if (!res.ok) {
        setIsLiked(prevLiked)
        setLikeCount(prevCount)
        if (res.status !== 401) {
          alert("Failed to update like. Please try again.")
        }
      } else {
        sessionStorage.removeItem(cacheKey)
      }
    } catch (error) {
      console.error("Error toggling like:", error)
      setIsLiked(prevLiked)
      setLikeCount(prevCount)
      alert("Failed to update like. Please try again.")
    } finally {
      setIsLiking(false)
    }
  }

  // ── Buy ticket ────────────────────────────────────────────────────────────

  const handleBuyTicket = (ticketType: string, ticketPrice: number | string) => {
    if (!eventData) return
    if (isEventPassed) { setShowPassedDialog(true); return }
    if (isSoldOut) { alert("Sorry, this event is sold out!"); return }
    if (isSaleEnded) { alert("Sorry, ticket sales have ended!"); return }

    if (!isAuthenticated) {
      if (typeof window !== "undefined")
        sessionStorage.setItem("redirectAfterLogin", window.location.pathname)
      router.push("/auth/login")
      return
    }

    const parsedPrice = typeof ticketPrice === "string" ? parseFloat(ticketPrice) : ticketPrice
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "spotix_payment_data",
        JSON.stringify({
          eventId,
          eventName: eventData.eventName,
          ticketType,
          ticketPrice: parsedPrice,
          eventCreatorId: creatorId,
        })
      )
    }
    setShowBuyTicketDialog(false)
    router.push("/payment")
  }

  // ── Render guards ─────────────────────────────────────────────────────────

  if (!isPageLoaded) return <Preloader />
  if (loading) return <EventSkeleton />
  if (!eventData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={64} className="text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-6">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/home")}
            className="px-6 py-3 bg-[#6b2fa5] text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Browse Events
          </button>
        </div>
      </div>
    )
  }

  // ── Shared CTA state ──────────────────────────────────────────────────────

  const ctaDisabled = isEventPassed || isSoldOut || isSaleEnded
  const ctaLabel = isEventPassed
    ? "Event Has Passed"
    : isSoldOut
    ? "Sold Out"
    : isSaleEnded
    ? "Sales Ended"
    : eventData.isFree
    ? "Register Now"
    : "Buy Tickets"

  const CtaButton = ({ mobile = false }: { mobile?: boolean }) =>
    ctaDisabled ? (
      <button
        disabled
        onClick={isEventPassed ? () => setShowPassedDialog(true) : undefined}
        className={`w-full bg-gray-400 text-white rounded-lg font-semibold text-lg cursor-not-allowed shadow-md ${
          mobile ? "py-3" : "py-3.5 px-6"
        }`}
      >
        {ctaLabel}
      </button>
    ) : (
      <button
        onClick={() => setShowBuyTicketDialog(true)}
        className={`w-full bg-gradient-to-r from-[#6b2fa5] to-purple-700 text-white rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
          mobile ? "py-3" : "py-3.5 px-6"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          <Ticket size={mobile ? 20 : 22} />
          {eventData.isFree ? (mobile ? "Register" : "Register Now") : "Buy Tickets"}
          {isEventToday && <span className="animate-pulse">🔥</span>}
        </div>
      </button>
    )

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <>
      <UserHeader />

      {/*
        pb-24 lg:pb-0:
          - On mobile/tablet (< lg): adds bottom padding so the last content
            section (Footer) is never hidden behind the fixed bottom CTA bar.
          - On lg+: removed entirely — the bar is hidden (lg:hidden) so no
            padding is needed.
      */}
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pb-24 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-[#6b2fa5] transition-colors group"
            >
              <div className="p-2 rounded-full group-hover:bg-purple-100 transition-colors">
                <ArrowLeft size={20} />
              </div>
              <span className="font-medium hidden sm:inline">Back</span>
            </button>

            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                  <Wallet size={18} className="text-[#6b2fa5]" />
                  <span className="font-semibold text-gray-900">₦{formatNumber(walletBalance)}</span>
                </div>
              )}
              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors group"
              >
                <Flag size={18} className="text-gray-600 group-hover:text-red-600" />
                <span className="font-medium text-gray-700 group-hover:text-red-600 hidden sm:inline">
                  Report
                </span>
              </button>
              {!isAuthenticated && <LoginButton />}
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {eventData.eventImages && eventData.eventImages.length > 1 ? (
                  <ImageCarousel images={eventData.eventImages} eventName={eventData.eventName} />
                ) : (
                  <LazyImage
                    src={eventData.eventImage || "/placeholder.svg"}
                    alt={eventData.eventName}
                    className="w-full h-[300px] sm:h-[400px] lg:h-[500px]"
                    showFullscreenIcon
                  />
                )}
              </div>

              <EventDetailsSection
                eventData={eventData}
                eventUrl={eventUrl}
                isLiked={isLiked}
                likeCount={likeCount}
                isLiking={isLiking}
                isSoldOut={isSoldOut}
                onToggleLike={handleToggleLike}
              />

              <LocationSection eventVenue={eventData.eventVenue} eventName={""} />
              <MerchSection eventId={eventId} creatorId={creatorId} />
              <ReviewsSection
                eventId={eventId}
                eventName={eventData.eventName}
                eventEndDate={eventData.eventEndDate}
                eventEnd={eventData.eventEnd}
                hasEventEnded={hasEventEnded()}
                isAuthenticated={isAuthenticated}
              />
            </div>

            {/* Right column */}
            <div className="space-y-6 lg:relative lg:z-0">
              <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 border-purple-100 lg:sticky lg:top-6 lg:z-10">
                <div className="mb-6">
                  {eventData.isFree ? (
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full shadow-lg mb-4">
                        <Ticket size={24} />
                        <span className="text-2xl font-bold">FREE EVENT</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center mb-4">
                      <p className="text-gray-600 mb-2">Starting from</p>
                      <p className="text-4xl font-bold text-[#6b2fa5]">
                        ₦
                        {formatNumber(
                          eventData.ticketPrices?.length
                            ? Math.min(...eventData.ticketPrices.map((t) => t.price))
                            : 0
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-4">Get Your Tickets</h3>

                {!eventData.isFree && eventData.ticketPrices?.length > 0 && (
                  <div className="mb-6 space-y-3">
                    <p className="text-sm font-medium text-gray-600 mb-2">Ticket Options:</p>
                    {eventData.ticketPrices.map((ticket, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-purple-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-800">{ticket.policy}</span>
                        <span className="font-bold text-[#6b2fa5]">₦{formatNumber(ticket.price)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg">
                  {eventData.enableMaxSize && eventData.maxSize && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tickets Sold:</span>
                      <span className="font-semibold text-gray-900">
                        {eventData.ticketsSold || 0} / {eventData.maxSize}
                      </span>
                    </div>
                  )}
                  {eventData.enableStopDate && eventData.stopDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sales End:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(eventData.stopDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <CtaButton />
              </div>

              <div ref={bookerDetailsRef}>
                <BookerDetailsSection
                  bookerDetails={bookerDetails}
                  bookerName={eventData.bookerName}
                  creatorId={eventData.createdBy}
                />
              </div>
            </div>
          </div>
        </div>

        {/*
          Mobile fixed CTA bar.
          - lg:hidden: completely absent on desktop — the right-column sticky
            card already owns the CTA there.
          - Always fixed to the bottom; no scroll-driven top/bottom toggling.
            The pb-24 on the parent ensures the footer is never obscured.
        */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
          <div className="max-w-4xl mx-auto">
            <CtaButton mobile />
          </div>
        </div>

        {/* Buy Ticket Dialog */}
        {showBuyTicketDialog && (
          <BuyTicketDialog
            eventData={eventData}
            isEventToday={isEventToday}
            isEventPassed={isEventPassed}
            isSoldOut={isSoldOut}
            isSaleEnded={isSaleEnded}
            onBuyTicket={handleBuyTicket}
            onClose={() => setShowBuyTicketDialog(false)}
            onShowPassedDialog={() => setShowPassedDialog(true)}
          />
        )}

        {/* Passed Dialog */}
        {showPassedDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Event Has Passed</h3>
                <button
                  onClick={() => setShowPassedDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                Dear {isAuthenticated ? username || "there" : "Guest"}, this event has already
                occurred; you can no longer purchase tickets. Please check out other events on our
                platform.
              </p>
              <button
                onClick={() => router.push("/home")}
                className="w-full bg-[#6b2fa5] text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Browse Events
              </button>
            </div>
          </div>
        )}

        {/* Report Modal */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          eventId={eventId || ""}
          creatorId={creatorId || ""}
          eventName={eventData.eventName}
        />
      </div>

      <div ref={footerRef}>
        <Footer />
      </div>

      <style jsx>{`
        @keyframes marquee-smooth {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-smooth {
          animation: marquee-smooth 30s linear infinite;
        }
      `}</style>
    </>
  )
}