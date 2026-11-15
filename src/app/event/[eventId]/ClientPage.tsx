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
import { X, AlertCircle } from "lucide-react"
import Preloader from "@/components/Preloader"
import { EventHero } from "./components/event-hero"
import { EventTopBar } from "./components/event-top-bar"
import { SectionNav, type SectionNavItem } from "./components/section-nav"
import { TicketPicker } from "./components/ticket-picker"
import { CrewSection } from "./components/crew-section"
import { CtaButton } from "./components/cta-button"
import { MobileCtaBar } from "./components/mobile-cta-bar"
import { getStartingPrice } from "./lib/pricing"
import EventDetailsSection from "./event-details-section"
import LocationSection from "./location-section"
// import ReviewsSection from "./reviews-section"
import BookerDetailsSection from "./booker-details-section"
import BuyTicketDrawer from "./buy-ticket-dialog"
import MerchSection from "./merch-section"
import { ReportModal } from "./report-modal"
import VotingSection from "./voting"
import { CheckTicketPaymentSheet } from "./CheckTicketPaymentModal"
import { useNumeroxTrack } from "@/app/lib/numerox-track-client"
import { cleanupExpiredEventCache } from "@/app/lib/eventCacheCleanup"
import { useEventLocationSignal } from "./hooks/useEventLocationSignal"
import { LocationPermissionPopup } from "./components/location-permission-popup"

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

//  Skeleton / Preloader 
//
// The event page's loading state is now the same branded "Spotix" preloader
// (components/Preloader.tsx) used on booker-confirm, iwss, and the landing
// page, instead of a bespoke gif/skeleton — see the render guards below.

//  ClientPage 

export default function ClientPage({ params, initialEventData, referralCode }: ClientPageProps) {
  const { createdBy, eventId } = params
  const router = useRouter()

  // Event data
  const [eventData, setEventData] = useState<EventType | null>(initialEventData || null)
  const [loading, setLoading] = useState(!initialEventData)

  // ── Location + device signal for Numerox ──
  // See useEventLocationSignal.ts: resolves a best-effort state via the
  // no-permission edge/IP fallback immediately, and upgrades to a
  // precise GPS fix if the visitor already granted (or now grants via
  // the on-page popup) location access. getClientLocationDevice is
  // awaited by useNumeroxTrack below (bounded — never blocks the ping
  // indefinitely) so this pageview carries it when available.
  const { showLocationPopup, onAllowLocation, onDismissLocationPopup, getClientLocationDevice } =
    useEventLocationSignal()

  //  Numerox funnel tracking ─
  // "Someone opened this event's page." `params.eventId` is whatever the
  // URL segment was — the real Firestore doc id OR a booker-chosen
  // shareable slug (see page.tsx's fetchEventData comment) — so we track
  // against `eventData.id`, the resolved real doc id, instead. Numerox
  // stores/reads everything keyed by the real eventId (spotix-booker's
  // Observability tab queries `events/{eventId}` doc ids, never slugs),
  // so tracking under the slug silently orphaned the event's funnel data.
  // `initialEventData` is already resolved server-side before this
  // component mounts, so this fires on first render same as before,
  // just against the correct id.
  useNumeroxTrack(eventData?.id, "EVENT_PAGE_VIEW", true, getClientLocationDevice)

  //  Auth state 
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
  const [showBuyTicketDrawer, setShowBuyTicketDrawer] = useState(false)
  const [isPageLoaded, setIsPageLoaded] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showCheckPaymentModal, setShowCheckPaymentModal] = useState(false)

  const footerRef = useRef<HTMLDivElement>(null)
  const bookerDetailsRef = useRef<HTMLDivElement>(null)

  const cacheKey = `event_${eventId}_${createdBy}`
  const CACHE_TTL = 5 * 60 * 1000

  //  Step 1: Spotix JWT check 
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

  //  Step 2: Firebase auth state 
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

  //  Referral link capture ─
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

  //  Fetch user display data ─
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

  //  Fetch like status 

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

  //  Fetch event data 

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

  //  Fetch booker details 

  useEffect(() => {
    if (!eventData?.createdBy) return

    const fetchBookerDetails = async () => {
      try {
        // eventId here is whatever the URL segment was — could be the real
        // Firestore doc id OR a booker-chosen shareable slug (see page.tsx's
        // fetchEventData comment). /api/v1/event/creator doesn't do slug
        // resolution the way /api/v1/event does, so this has to use
        // eventData.id — the already-resolved real doc id — not the raw
        // eventId param, or a slugged event 404s here even though the page
        // itself loaded fine.
        const response = await fetch(`/api/v1/event/creator?eventId=${eventData.id}`)
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
  }, [eventData?.createdBy, eventData?.id])

  //  Body scroll lock 

  // Hiding the body's overflow also removes a classic (non-overlay) scrollbar, which widens
  // the page by the scrollbar's width and makes everything — sticky header included — jump
  // sideways as the drawer opens. `scrollbar-gutter: stable` keeps that space reserved so
  // nothing shifts; browsers without it get the same effect via body padding. Overlay
  // scrollbars (most phones) have no width, so neither is applied there.

  const sheetOpen = showBuyTicketDrawer || showCheckPaymentModal

  useEffect(() => {
    if (!sheetOpen) return

    const body = document.body
    const root = document.documentElement
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight
    const prevGutter = root.style.scrollbarGutter

    const scrollbarWidth = window.innerWidth - root.clientWidth
    if (scrollbarWidth > 0) {
      if (typeof CSS !== "undefined" && CSS.supports("scrollbar-gutter", "stable")) {
        root.style.scrollbarGutter = "stable"
      } else {
        body.style.paddingRight = `${scrollbarWidth}px`
      }
    }
    body.style.overflow = "hidden"

    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
      root.style.scrollbarGutter = prevGutter
    }
  }, [sheetOpen])

  //  Event URL ─

  useEffect(() => {
    if (typeof window !== "undefined") setEventUrl(window.location.href)
  }, [])

  //  Background cleanup of expired event caches ─
  // Runs once per page load, off the critical rendering path — sweeps
  // sessionStorage for any stored event (this one or any other previously
  // viewed in this tab) whose eventEndDate has already passed.

  useEffect(() => {
    cleanupExpiredEventCache()
  }, [])

  //  Event status flags 

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

  //  Live ticket availability (never cached) ─
  // The rest of eventData can be serving a cached snapshot up to 30s old
  // (see lib/eventCache.ts — a purchase no longer busts that cache). This
  // fills in real-time stock/sale-window numbers from the one endpoint
  // that's always live, so the buy dialog and CTA never show stale
  // "tickets left" counts even while the general event data does lag.

  useEffect(() => {
    if (!eventData?.id) return
    let cancelled = false

    const fetchAvailability = async () => {
      try {
        const response = await fetch(`/api/v1/event/availability?eventId=${eventData.id}`, {
          cache: "no-store",
        })
        if (!response.ok) return
        const result = await response.json()
        if (cancelled || !result.success) return

        const live = result.data as {
          ticketsSold: number
          isEventPassed: boolean
          isSoldOut: boolean
          isSaleEnded: boolean
          tickets: { policy: string; ticketsSold: number; availableTickets: number | null }[]
        }

        const byPolicy = new Map(live.tickets.map((t) => [t.policy, t]))
        setEventData((prev) =>
          prev
            ? {
                ...prev,
                ticketsSold: live.ticketsSold,
                ticketPrices: prev.ticketPrices.map((t) => {
                  const liveTicket = byPolicy.get(t.policy)
                  if (!liveTicket) return t
                  return {
                    ...t,
                    ticketsSold: liveTicket.ticketsSold,
                    availableTickets: liveTicket.availableTickets ?? undefined,
                  }
                }),
              }
            : prev
        )
        setIsEventPassed(live.isEventPassed)
        setIsSoldOut(live.isSoldOut)
        setIsSaleEnded(live.isSaleEnded)
      } catch (error) {
        console.error("Error fetching live ticket availability:", error)
      }
    }

    fetchAvailability()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventData?.id])

  //  Page loaded ─

  useEffect(() => {
    const t = setTimeout(() => setIsPageLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  //  hasEventEnded ─

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

  //  Toggle like ─

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

  //  Buy ticket 

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
        feeBurden: eventData.feeBurden,
        addons: eventData.addons,
        cart,
      }
      sessionStorage.setItem("spotix_payment_data", JSON.stringify(paymentData))
    }
    // Keep the drawer mounted so its "One moment.." loading state stays visible
    // while the payment/queue page loads; it unmounts naturally once we navigate away.
    const guestSuffix = !isAuthenticated ? "?mode=guest" : ""
    const destination = eventData.virtualQueueEnabled
      ? `/event/${eventId}/queue${guestSuffix}`
      : `/event/${eventId}/payment${guestSuffix}`
    router.push(destination)
  }

  //  Render guards ─���─

  if (!isPageLoaded) return <Preloader />
  if (loading) return <Preloader />
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

  //  CTA state ─

  const ctaDisabled = isEventPassed || isSoldOut || isSaleEnded
  const ctaLabel = isEventPassed
    ? "Event Has Passed"
    : isSoldOut
      ? "Sold Out"
      : isSaleEnded
        ? "Sales Ended"
        : ""
  const ticketsUnavailableLabel = isEventPassed
    ? "Event has passed"
    : isSoldOut
      ? "Sold out"
      : isSaleEnded
        ? "Sales ended"
        : null

  const openBuyDrawer = () => setShowBuyTicketDrawer(true)
  const startingPrice = getStartingPrice(eventData)

  const navItems: SectionNavItem[] = [
    { id: "about", label: "About" },
    ...(eventData.isFree || eventData.ticketPrices?.length ? [{ id: "tickets", label: "Tickets" }] : []),
    ...(eventData.eventVenue ? [{ id: "location", label: "Location" }] : []),
    { id: "crew", label: "Invite" },
  ]

  const renderCta = (variant: "light" | "brand", size: "md" | "lg", fullWidth = false) => (
    <CtaButton
      disabled={ctaDisabled}
      disabledLabel={ctaLabel}
      isFree={eventData.isFree}
      isToday={isEventToday}
      onClick={openBuyDrawer}
      onDisabledClick={isEventPassed ? () => setShowPassedDialog(true) : undefined}
      variant={variant}
      size={size}
      fullWidth={fullWidth}
    />
  )

  //  Main render ─

  return (
    <>
      <UserHeader />

      <div className="relative min-h-screen bg-white pb-24 lg:pb-0">
        <EventHero
          eventData={eventData}
          isEventToday={isEventToday}
          isSoldOut={isSoldOut}
          isSaleEnded={isSaleEnded}
          topBar={
            <EventTopBar
              eventName={eventData.eventName}
              authChecked={authChecked}
              isAuthenticated={isAuthenticated}
              walletBalance={walletBalance}
              onReport={() => setShowReportModal(true)}
            />
          }
          cta={renderCta("light", "lg")}
        />

        <SectionNav items={navItems} />

        <main className="mx-auto max-w-7xl space-y-20 px-4 pb-16 pt-6 lg:space-y-28 lg:pb-28 lg:pt-10">
          {/* Voting banner sits right under the hero — it's easy to miss once it's buried further down. */}
          {eventData.votingId && (
            <div className="mx-auto max-w-3xl">
              <VotingSection votingId={eventData.votingId} votingPollName={eventData.votingPollName ?? null} />
            </div>
          )}

          <EventDetailsSection
            eventData={eventData}
            eventUrl={eventUrl}
            isLiked={isLiked}
            likeCount={likeCount}
            isLiking={isLiking}
            isSoldOut={isSoldOut}
            onToggleLike={handleToggleLike}
          />

          <TicketPicker
            eventData={eventData}
            eventUnavailableLabel={ticketsUnavailableLabel}
            onSelect={openBuyDrawer}
            onCheckPayment={() => setShowCheckPaymentModal(true)}
          />

          <LocationSection eventVenue={eventData.eventVenue} eventName={eventData.eventName} />

          <MerchSection
            eventId={eventId}
            apiEventId={eventData.id}
            createdBy={createdBy}
            eventName={eventData.eventName}
          />

          {/* <ReviewsSection
            eventId={eventId}
            eventName={eventData.eventName}
            eventEndDate={eventData.eventEndDate}
            eventEnd={eventData.eventEnd}
            hasEventEnded={hasEventEnded()}
            isAuthenticated={isAuthenticated}
          /> */}

          <CrewSection
            eventData={eventData}
            eventUrl={eventUrl}
            likeCount={likeCount}
            onGetTickets={ctaDisabled ? null : openBuyDrawer}
          />

          <div ref={bookerDetailsRef} className="mx-auto max-w-3xl">
            <BookerDetailsSection
              bookerDetails={bookerDetails}
              bookerName={eventData.bookerName}
              createdBy={eventData.createdBy}
            />
          </div>
        </main>

        {/* Mobile fixed CTA bar */}
        <MobileCtaBar startingPrice={startingPrice} cta={renderCta("brand", "md", true)} />

        {/* Buy Ticket Drawer */}
        {showBuyTicketDrawer && (
          <BuyTicketDrawer
            eventData={eventData}
            isEventToday={isEventToday}
            isEventPassed={isEventPassed}
            isSoldOut={isSoldOut}
            isSaleEnded={isSaleEnded}
            onBuyTicket={handleBuyTicket}
            onClose={() => setShowBuyTicketDrawer(false)}
            onShowPassedDialog={() => setShowPassedDialog(true)}
          />
        )}

        {/* Passed Dialog */}
        {showPassedDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200] p-4">
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

        {/* Check Payment Status Sheet */}
        {showCheckPaymentModal && (
          <CheckTicketPaymentSheet
            eventId={eventData.id}
            eventName={eventData.eventName}
            onClose={() => setShowCheckPaymentModal(false)}
          />
        )}
      </div>

      <div ref={footerRef}>
        <Footer />
      </div>

      {/* Location permission popup — see useEventLocationSignal.ts */}
      {showLocationPopup && (
        <LocationPermissionPopup onAllow={onAllowLocation} onDismiss={onDismissLocationPopup} />
      )}

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
