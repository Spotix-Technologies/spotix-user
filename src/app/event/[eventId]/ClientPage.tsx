// app/event/[eventId]/ClientPage.tsx


"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/app/lib/firebase"
import {
  getSessionUser,
  authFetch,
  logout,
  type SessionUser,
} from "@/app/lib/auth-client-user"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import { ArrowLeft, X, Wallet, AlertCircle, Flag, Ticket } from "lucide-react"
import LoginButton from "@/components/LoginButton"
import { formatNumber } from "@/utils/formatter"
import { EventImageSection } from "./components/event-image-section"
import { TicketSummaryCard } from "./components/ticket-summary-card"
import EventDetailsSection from "./event-details-section"
import LocationSection from "./location-section"
// import ReviewsSection from "./reviews-section"
import BookerDetailsSection from "./booker-details-section"
import BuyTicketDialog from "./buy-ticket-dialog"
import MerchSection from "./merch-section"
import { ReportModal } from "./report-modal"
import VotingSection from "./voting"
import { CheckTicketPaymentModal } from "./CheckTicketPaymentModal"

import type { EventType } from "./page"

interface ClientPageProps {
  params: {
    createdBy: string
    eventId: string
  }
  initialEventData?: EventType | null
  /** Referral name carried in via ?referral= on the event URL, e.g. from a
   *  "Share Referral Link" generated in the booker portal. Already sanitized
   *  (whitespace-stripped) server-side in page.tsx. */
  referralCode?: string
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

// Thin placeholder so the header auth area doesn't flicker/jump while the
// JWT check resolves. Matches the approximate width of the wallet badge.
const AuthSkeleton = () => (
  <div className="flex items-center gap-3">
    <div className="h-9 w-28 bg-gray-200 animate-pulse rounded-lg" />
  </div>
)

// ── ClientPage ────────────────────────────────────────────────────────────────

export default function ClientPage({ params, initialEventData, referralCode }: ClientPageProps) {
  const { createdBy, eventId } = params
  const router = useRouter()

  // Event data
  const [eventData, setEventData] = useState<EventType | null>(initialEventData || null)
  const [loading, setLoading] = useState(!initialEventData)

  // ── Auth state ────────────────────────────────────────────────────────────
  // Two-step resolution mirroring the payment client:
  //   1. getSessionUser() validates the Spotix JWT (fast, cookie-based)
  //   2. onAuthStateChanged confirms Firebase session (needed for Firestore reads)
  // authChecked gates ALL auth-dependent UI so nothing flickers on first render.
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  // Firebase user object — needed for Firestore reads (wallet, username)
  const [firebaseReady, setFirebaseReady] = useState(false)

  // User display data
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

  // Likes
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(initialEventData?.likeCount || 0)
  const [isLiking, setIsLiking] = useState(false)

  // UI
  const [eventUrl, setEventUrl] = useState("")
  const [showPassedDialog, setShowPassedDialog] = useState(false)
  const [showBuyTicketDialog, setShowBuyTicketDialog] = useState(false)
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showCheckPaymentModal, setShowCheckPaymentModal] = useState(false)

  const footerRef = useRef<HTMLDivElement>(null)
  const bookerDetailsRef = useRef<HTMLDivElement>(null)

  const cacheKey = `event_${eventId}_${createdBy}`
  const CACHE_TTL = 5 * 60 * 1000

  // ── Step 1: Spotix JWT check ──────────────────────────────────────────────
  // Identical to the original — this is the primary auth signal.

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

  // ── Step 2: Firebase auth state ──────────────────────────────────────────
  // Mirrors the payment client's onAuthStateChanged pattern.
  // Only used to confirm Firebase session is ready before Firestore reads.
  // Does NOT override the JWT-based isAuthenticated flag.

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Firebase session resolved (user or null) — Firestore reads are now safe
      setFirebaseReady(true)
    })
    return () => unsubscribe()
  }, [])

  // ── Referral link capture ─────────────────────────────────────────────────
  // A referral link looks like /event/{eventId}?referral={referralName}.
  // Stash it under the same sessionStorage key the payment page's manual
  // referral dropdown uses ("selected_referral_code"), so it's automatically
  // picked up and preserved all the way through checkout without the buyer
  // having to pick it again — and so it ends up on the payment record in the
  // database, same as a manually-selected referral.
  useEffect(() => {
    if (!referralCode) return
    if (typeof window === "undefined") return
    try {
      sessionStorage.setItem("selected_referral_code", JSON.stringify({ code: referralCode }))
    } catch (error) {
      console.error("Error storing referral code:", error)
    }
  }, [referralCode])

  // ── Fetch user display data ───────────────────────────────────────────────
  // Wait for both JWT check AND Firebase session before reading Firestore,
  // matching how the payment client waits for onAuthStateChanged before
  // calling fetchUserData / fetchWalletData.

  useEffect(() => {
    if (!authChecked || !firebaseReady || !sessionUser?.uid) return

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
  }, [authChecked, firebaseReady, sessionUser?.uid])

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

  // ── Fetch event data ──────────────────────────────────────────────────────

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
        const response = await fetch(`/api/v1/event/creator?eventId=${eventId}`)
        if (!response.ok) return
        const result = await response.json()
        if (result.success) {
          setBookerDetails(result.data)
          // Store booker details to localStorage for payment flow
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "spotix_organizer",
              JSON.stringify({
                bookername: result.data.username,
                bookeremail: result.data.email,
                organizerId: eventData?.createdBy,
              })
            )
          }
        }
      } catch (error) {
        console.error("Error fetching booker details:", error)
      }
    }

    fetchBookerDetails()
  }, [eventData?.createdBy, eventId])

  // ── Body scroll lock ──────────────────────────────────────────────────────

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
        if (res.status !== 401) alert("Failed to update like. Please try again.")
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

  const handleBuyTicket = (cart: any[]) => {
    if (!eventData || cart.length === 0) return
    if (isEventPassed) { setShowPassedDialog(true); return }
    if (isSoldOut) { alert("Sorry, this event is sold out!"); return }
    if (isSaleEnded) { alert("Sorry, ticket sales have ended!"); return }

    if (typeof window !== "undefined") {
      const firstItem = cart[0]
      // Compute the total subtotal from the cart so free events (price=0) result in ticketPrice=0
      const cartSubtotal = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
      const paymentData = {
        eventId,
        eventName: eventData.eventName,
        ticketType: firstItem.ticketType,
        ticketPrice: cartSubtotal,
        eventCreatorId: createdBy,
        organizerId: eventData.organizerId || createdBy,
        eventVenue: eventData.eventVenue || "",
        eventType: eventData.eventType || "",
        eventDate: eventData.eventDate || "",
        eventEndDate: eventData.eventEndDate || "",
        eventStart: eventData.eventStart || "",
        eventEnd: eventData.eventEnd || "",
        stopDate: eventData.stopDate || "",
        bookerName: eventData.bookerName || "",
        bookerEmail: eventData.bookerEmail || "",
        cart,
      }
      sessionStorage.setItem("spotix_payment_data", JSON.stringify(paymentData))
    }
    // Keep the dialog mounted so its "One moment.." loading state stays visible
    // while the payment/queue page loads; it unmounts naturally once we navigate away.
    const guestSuffix = !isAuthenticated ? "?mode=guest" : ""
    const destination = eventData.virtualQueueEnabled
      ? `/event/${eventId}/queue${guestSuffix}`
      : `/event/${eventId}/payment${guestSuffix}`
    router.push(destination)
  }

  // ── Render guards ───────────────────────────────────────���─────────────────

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

  // ── CTA state ─────────────────────────────────────────────────────────────

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
        className={`w-full bg-gray-400 text-white rounded-lg font-semibold text-lg cursor-not-allowed shadow-md ${mobile ? "py-3" : "py-3.5 px-6"}`}
      >
        {ctaLabel}
      </button>
    ) : (
      <button
        onClick={() => setShowBuyTicketDialog(true)}
        className={`w-full bg-gradient-to-r from-[#6b2fa5] to-purple-700 text-white rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${mobile ? "py-3" : "py-3.5 px-6"}`}
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

      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 pb-24 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8">

          {/* Header row */}
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

            {/* Auth-aware right section.
                While authChecked is false we show a skeleton so there is no
                flash of "not logged in" state — same principle as the payment
                client holding the loading spinner until onAuthStateChanged
                resolves. */}
            <div className="flex items-center gap-3">
              {!authChecked ? (
                <AuthSkeleton />
              ) : isAuthenticated ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
                    <Wallet size={18} className="text-[#6b2fa5]" />
                    <span className="font-semibold text-gray-900">
                      ₦{formatNumber(walletBalance)}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors group"
                  >
                    <Flag size={18} className="text-gray-600 group-hover:text-red-600" />
                    <span className="font-medium text-gray-700 group-hover:text-red-600 hidden sm:inline">
                      Report
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-red-50 hover:border-red-200 transition-colors group"
                  >
                    <Flag size={18} className="text-gray-600 group-hover:text-red-600" />
                    <span className="font-medium text-gray-700 group-hover:text-red-600 hidden sm:inline">
                      Report
                    </span>
                  </button>
                  <LoginButton />
                </>
              )}
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              <EventImageSection
                eventImages={eventData.eventImages}
                eventName={eventData.eventName}
                eventImage={eventData.eventImage}
                showFullscreenIcon
              />
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
              <MerchSection eventId={eventId} createdBy={createdBy} />
              {/* <ReviewsSection
                eventId={eventId}
                eventName={eventData.eventName}
                eventEndDate={eventData.eventEndDate}
                eventEnd={eventData.eventEnd}
                hasEventEnded={hasEventEnded()}
                isAuthenticated={isAuthenticated}
              /> */}
            </div>

            {/* Right column */}
            <div className="space-y-6 lg:relative lg:z-0">
              {/* Voting banner sits at the very top of this column — right
                  where buyers land — since it's easy to miss once it's
                  buried below the ticket/booker info. */}
              {eventData.votingId && (
                <VotingSection
                  votingId={eventData.votingId}
                  votingPollName={eventData.votingPollName ?? null}
                />
              )}
              <div>
                <TicketSummaryCard eventData={eventData} />
                <div className="mt-6">
                  <CtaButton />
                </div>
                <button
                  onClick={() => setShowCheckPaymentModal(true)}
                  className="w-full mt-3 text-center text-xs text-gray-500 hover:text-[#6b2fa5] font-medium underline underline-offset-2 transition-colors"
                >
                  Already paid? Check your payment status
                </button>
              </div>
              <div ref={bookerDetailsRef}>
                <BookerDetailsSection
                  bookerDetails={bookerDetails}
                  bookerName={eventData.bookerName}
                  createdBy={eventData.createdBy}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile fixed CTA bar */}
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
                occurred; you can no longer purchase tickets. Please check out other events on
                our platform.
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
        {showReportModal && (
          <ReportModal
            onClose={() => setShowReportModal(false)}
            eventId={eventId || ""}
            eventName={eventData.eventName}
          />
        )}

        {/* Check Payment Status Modal */}
        {showCheckPaymentModal && (
          <CheckTicketPaymentModal
            eventName={eventData.eventName}
            onClose={() => setShowCheckPaymentModal(false)}
          />
        )}
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
