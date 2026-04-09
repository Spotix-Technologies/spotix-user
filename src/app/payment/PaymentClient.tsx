"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ShieldCheck, X } from "lucide-react"
import { getSessionUser, type SessionUser } from "@/app/lib/auth-client"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import PayWithPaystack from "@/components/PayWithPaystack"
import { calculateVATFee } from "@/utils/priceUtility"

// Helper components
import OrderSummary from "./helpers/order-summary"
import Discount from "./helpers/discount"
import Referral from "./helpers/referral"
import PaymentMethods from "./helpers/payment-methods"
import EventSurveyForm from "./helpers/event-survey-form"
import GuestCheckoutForm from "./helpers/guest-checkout-form"

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentData {
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  eventCreatorId: string
  eventVenue?: string
  eventType?: string
  eventDate?: string
  eventEndDate?: string
  eventStart?: string
  eventEnd?: string
  stopDate?: string
  bookerName?: string
  bookerEmail?: string
}

interface DiscountData {
  code: string
  discountType: "percentage" | "fixed"
  discountValue: number
  maxUses: number
  currentUses: number
  expiryDate: string
}

interface ReferralData {
  code: string
}

interface ReferralCodeOption {
  code: string
}

/** Resolved identity — either from JWT session or guest form */
interface CheckoutUser {
  fullName: string
  email: string
  phone?: string
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PaymentClient() {
  const router = useRouter()

  // Auth state
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

  // Resolved checkout identity (logged-in user OR confirmed guest)
  const [checkoutUser, setCheckoutUser] = useState<CheckoutUser | null>(null)

  // Guest flow gate: false = show guest form, true = guest confirmed
  const [guestConfirmed, setGuestConfirmed] = useState(false)

  // Payment / event data
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  // Discount
  const [discountCode, setDiscountCode] = useState("")
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountData, setDiscountData] = useState<DiscountData | null>(null)
  const [discountError, setDiscountError] = useState("")

  // Referral
  const [referralCodes, setReferralCodes] = useState<ReferralCodeOption[]>([])
  const [referralFetching, setReferralFetching] = useState(false)
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [referralError, setReferralError] = useState("")
  const [showReferralDropdown, setShowReferralDropdown] = useState(false)

  // Paystack
  const [showPaystackModal, setShowPaystackModal] = useState(false)
  const [paystackReference, setPaystackReference] = useState<string | null>(null)
  const [creatingReference, setCreatingReference] = useState(false)

  // Survey
  const [surveyResponses, setSurveyResponses] = useState<Record<string, any> | null>(null)
  const [isSurveyComplete, setIsSurveyComplete] = useState(false)

  // ── Auth check ───────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      try {
        const user = await getSessionUser()
        if (cancelled) return

        if (user) {
          setSessionUser(user)
          setIsAuthenticated(true)
          const userData = await fetchUserData(user.uid)
          if (userData) setCheckoutUser(userData)
          await fetchWalletData()
        } else {
          setIsAuthenticated(false)
          // Try to restore a previously confirmed guest from localStorage
          const stored = typeof window !== "undefined"
            ? localStorage.getItem("spotix_guest_info")
            : null
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as { fullName: string; email: string; phone?: string }
              if (parsed.fullName && parsed.email) {
                setCheckoutUser(parsed)
                setGuestConfirmed(true)
              }
            } catch { /* ignore */ }
          }
        }
      } catch (error) {
        console.error("[PaymentClient] Auth check error:", error)
        setIsAuthenticated(false)
      } finally {
        if (!cancelled) setAuthChecked(true)
      }
    }

    checkAuth()
    return () => { cancelled = true }
  }, [])

  // ── Load payment data ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authChecked) return

    const load = async () => {
      const raw = sessionStorage.getItem("spotix_payment_data")
      if (!raw) { setDataLoading(false); return }

      try {
        const parsed: PaymentData = JSON.parse(raw)

        const needsDetails =
          !parsed.eventVenue || !parsed.eventType || !parsed.eventDate || !parsed.bookerName

        if (needsDetails && parsed.eventCreatorId && parsed.eventId) {
          const complete = await fetchEventDetails(parsed.eventCreatorId, parsed.eventId, parsed)
          setPaymentData(complete)
        } else {
          setPaymentData(parsed)
        }

        if (parsed.eventCreatorId && parsed.eventId) {
          fetchReferralCodes(parsed.eventCreatorId, parsed.eventId)
        }

        const storedReferral = sessionStorage.getItem("selected_referral_code")
        if (storedReferral) {
          try { setReferralData(JSON.parse(storedReferral)) } catch { /* ignore */ }
        }
      } catch (e) {
        console.error("Error parsing payment data:", e)
      } finally {
        setDataLoading(false)
      }
    }

    load()
  }, [authChecked])

  // ── Data fetchers ────────────────────────────────────────────────────────────

  const fetchUserData = async (userId: string): Promise<CheckoutUser | null> => {
    try {
      const res = await fetch(`/api/v1/user/${userId}`, { credentials: "include" })
      if (!res.ok) return null
      const data = await res.json()
      return {
        fullName: data.fullName || data.username || "Valued Customer",
        email: data.email || "",
      }
    } catch { return null }
  }

  const fetchEventDetails = async (
    creatorId: string,
    eventId: string,
    existing: PaymentData
  ): Promise<PaymentData> => {
    try {
      const res = await fetch(`/api/event/list/${eventId}`, { credentials: "include" })
      if (!res.ok) return existing
      const data = await res.json()
      const event = data.event || data
      return {
        ...existing,
        eventVenue:   event.eventVenue   || existing.eventVenue   || "",
        eventType:    event.eventType    || existing.eventType    || "",
        eventDate:    event.eventDate    || existing.eventDate    || "",
        eventEndDate: event.eventEndDate || existing.eventEndDate || "",
        eventStart:   event.eventStart   || existing.eventStart   || "",
        eventEnd:     event.eventEnd     || existing.eventEnd     || "",
        stopDate:     event.enableStopDate ? event.stopDate : existing.stopDate,
        bookerName:   event.bookerName   || existing.bookerName   || "Event Host",
        bookerEmail:  event.bookerEmail  || existing.bookerEmail  || "support@spotix.com.ng",
      }
    } catch { return existing }
  }

  const fetchWalletData = async () => {
    try {
      const res = await fetch("/api/v1/iwss", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setWalletBalance(data.balance || 0)
      }
    } catch { setWalletBalance(0) }
  }

  const fetchReferralCodes = async (eventCreatorId: string, eventId: string) => {
    setReferralFetching(true)
    try {
      const res = await fetch(
        `/api/v1/referrals?eventCreatorId=${eventCreatorId}&eventId=${eventId}`,
        { credentials: "include" }
      )
      if (res.ok) {
        const data = await res.json()
        setReferralCodes((data.referrals || []).map((r: any) => ({ code: r.code || r.id })))
      }
    } catch {
      setReferralError("Failed to load referral codes")
    } finally {
      setReferralFetching(false)
    }
  }

  // ── Guest confirmation ───────────────────────────────────────────────────────

  const handleGuestSubmit = (fullName: string, email: string, phone: string) => {
    const guest: CheckoutUser = { fullName, email, phone }
    setCheckoutUser(guest)
    setGuestConfirmed(true)
    // Persist so refresh doesn't lose it
    localStorage.setItem("spotix_guest_info", JSON.stringify(guest))
  }

  // ── Discount ─────────────────────────────────────────────────────────────────

  const validateDiscount = async () => {
    if (!discountCode.trim()) { setDiscountError("Please enter a discount code"); return }
    setDiscountLoading(true)
    setDiscountError("")
    try {
      const res = await fetch("/api/v1/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: discountCode.trim(), eventId: paymentData?.eventId }),
      })
      const data = await res.json()
      if (!res.ok) { setDiscountError(data.message || "Invalid discount code"); setDiscountData(null); return }
      setDiscountData(data)
      setDiscountError("")
    } catch {
      setDiscountError("Failed to validate discount code")
      setDiscountData(null)
    } finally {
      setDiscountLoading(false)
    }
  }

  // ── Referral ──────────────────────────────────────────────────────────────────

  const selectReferral = (code: string) => {
    const r: ReferralData = { code }
    setReferralData(r)
    sessionStorage.setItem("selected_referral_code", JSON.stringify(r))
    setShowReferralDropdown(false)
    setReferralError("")
  }

  const removeReferral = () => {
    setReferralData(null)
    sessionStorage.removeItem("selected_referral_code")
  }

  // ── Payment ───────────────────────────────────────────────────────────────────

  const handlePaymentMethodSelect = (method: string) => {
    if (!paymentData) return
    const isFree = paymentData.ticketPrice === 0
    if (isFree && (method === "paystack" || method === "agent")) return
    setSelectedMethod(method)
  }

  const createPaymentReference = async (): Promise<string | null> => {
    if (!paymentData || !checkoutUser) return null
    setCreatingReference(true)

    try {
      const isFree = paymentData.ticketPrice === 0

      let discountAmount = 0
      if (discountData && !isFree) {
        discountAmount = discountData.discountType === "percentage"
          ? (paymentData.ticketPrice * discountData.discountValue) / 100
          : discountData.discountValue
      }

      const subtotal = paymentData.ticketPrice - discountAmount
      const vatFee = isFree ? 0 : calculateVATFee(Number(paymentData.ticketPrice))
      const totalAmount = subtotal + vatFee

      const endpoint = isFree ? "/api/v1/ref/free" : "/api/v1/create-pay-ref"

      const body: any = {
        eventId:        paymentData.eventId,
        eventCreatorId: paymentData.eventCreatorId,
        ticketType:     paymentData.ticketType,
        referralCode:   referralData?.code || null,
        referralData:   referralData || null,
        eventName:      paymentData.eventName,
        eventVenue:     paymentData.eventVenue     || null,
        eventType:      paymentData.eventType      || null,
        eventDate:      paymentData.eventDate      || null,
        eventEndDate:   paymentData.eventEndDate   || null,
        eventStart:     paymentData.eventStart     || null,
        eventEnd:       paymentData.eventEnd       || null,
        stopDate:       paymentData.stopDate       || null,
        bookerName:     paymentData.bookerName     || null,
        bookerEmail:    paymentData.bookerEmail    || null,
        userFullName:   checkoutUser.fullName,
        userEmail:      checkoutUser.email,
        // Flag so the backend knows this is a guest purchase
        isGuest:        !isAuthenticated,
        guestPhone:     !isAuthenticated ? (checkoutUser.phone || null) : null,
      }

      if (!isFree) {
        body.ticketPrice    = paymentData.ticketPrice
        body.totalAmount    = totalAmount
        body.transactionFee = vatFee
        body.discountCode   = discountData?.code  || null
        body.discountData   = discountData        || null
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create reference")
      }

      const data = await res.json()
      return data.reference
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create reference")
      return null
    } finally {
      setCreatingReference(false)
    }
  }

  const submitSurveyResponses = async () => {
    if (!paymentData || !checkoutUser || !surveyResponses || Object.keys(surveyResponses).length === 0) return
    try {
      await fetch("/api/v1/survey/response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // For guests there's no userId — backend should handle null gracefully
          userId: sessionUser?.uid || null,
          eventId: paymentData.eventId,
          responses: surveyResponses,
          attendeeInfo: {
            fullName:   checkoutUser.fullName,
            email:      checkoutUser.email,
            ticketType: paymentData.ticketType,
            isGuest:    !isAuthenticated,
          },
        }),
      })
    } catch (error) {
      console.error("Error submitting survey:", error)
      // Non-blocking — don't prevent payment
    }
  }

  const handleProceedPayment = async () => {
    if (!paymentData || !checkoutUser) return

    if (!isSurveyComplete && surveyResponses === null) {
      alert("Please complete the event registration form before proceeding.")
      return
    }

    const isFree = paymentData.ticketPrice === 0

    if (isFree) {
      const reference = await createPaymentReference()
      if (!reference) return

      await submitSurveyResponses()

      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
        const res = await fetch(`${BACKEND_URL}/v1/ticket/free`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        })
        if (res.ok) {
          router.push(`/payment/success?reference=${reference}`)
        } else {
          alert("Failed to generate free ticket. Please try again.")
        }
      } catch {
        alert("Failed to generate free ticket. Please try again.")
      }
      return
    }

    const enrichedPaymentData = {
      ...paymentData,
      discountCode:    discountData?.code  || null,
      discountData:    discountData        || null,
      referralCode:    referralData?.code  || null,
      referralData:    referralData        || null,
      userFullName:    checkoutUser.fullName,
      userEmail:       checkoutUser.email,
      surveyResponses: surveyResponses     || null,
      isGuest:         !isAuthenticated,
    }

    await submitSurveyResponses()

    if (selectedMethod === "paystack") {
      const reference = await createPaymentReference()
      if (!reference) return
      setPaystackReference(reference)
      sessionStorage.setItem("paystack_payment_data", JSON.stringify(enrichedPaymentData))
      setShowPaystackModal(true)
    } else {
      sessionStorage.setItem("spotix_payment_data", JSON.stringify(enrichedPaymentData))
      const params = new URLSearchParams({
        eventId:        paymentData.eventId,
        eventName:      paymentData.eventName,
        ticketType:     paymentData.ticketType,
        ticketPrice:    paymentData.ticketPrice.toString(),
        eventCreatorId: paymentData.eventCreatorId,
      })
      const routes: Record<string, string> = {
        wallet:  `/payment/wallet?${params}`,
        agent:   `/payment/agent?${params}`,
        bitcoin: `/payment/bitcoin?${params}`,
      }
      if (selectedMethod && routes[selectedMethod]) {
        router.push(routes[selectedMethod])
      }
    }
  }

  const handlePaystackSuccess = (reference: string) => {
    router.push(`/payment/success?reference=${reference}`)
  }

  const handlePaystackClose = () => {
    setShowPaystackModal(false)
    setPaystackReference(null)
  }

  // ── Derived values ────────────────────────────────────────────────────────────

  const isFreeEvent = paymentData?.ticketPrice === 0
  const vatFee = isFreeEvent || !paymentData ? 0 : calculateVATFee(Number(paymentData.ticketPrice))

  let discountAmount = 0
  if (discountData && paymentData && !isFreeEvent) {
    discountAmount = discountData.discountType === "percentage"
      ? (paymentData.ticketPrice * discountData.discountValue) / 100
      : discountData.discountValue
  }

  const totalAmount = paymentData ? (paymentData.ticketPrice - discountAmount) + vatFee : 0

  // ── Loading / error states ───────────────────────────────────────────────────

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-8 text-center w-full max-w-md">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Payment Details</h2>
          <p className="text-gray-600">Please wait while we prepare your checkout...</p>
        </div>
      </div>
    )
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-8 text-center w-full max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Session Expired</h2>
          <p className="text-gray-600 mb-6">
            Your payment session has expired. Please go back to the event page and try again.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-3 text-white font-semibold rounded-xl"
            style={{ background: "#6b2fa5" }}
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  // ── Guest gate: show guest form until they confirm identity ───────────────────
  if (!isAuthenticated && !guestConfirmed) {
    return (
      <GuestCheckoutForm
        onSubmitGuest={handleGuestSubmit}
        onShowSignIn={() => router.push(`/auth/login?redirect=/payment`)}
      />
    )
  }

  // ── Main checkout UI ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex flex-col">
      <UserHeader />

      <main className="flex-1 w-full">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Page title */}
          <div className="mb-6 sm:mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-purple-700 transition-colors mb-4"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Event</span>
            </button>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#6b2fa5" }}
              >
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">
                  {isFreeEvent ? "Complete Registration" : "Secure Checkout"}
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  {isFreeEvent
                    ? "Register for this free event"
                    : "Choose your preferred payment method"}
                </p>
              </div>
            </div>

            {/* Guest identity reminder */}
            {!isAuthenticated && checkoutUser && (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-purple-50 border border-purple-100 rounded-lg px-4 py-2">
                <span>Checking out as</span>
                <span className="font-semibold text-gray-900">{checkoutUser.fullName}</span>
                <span className="text-gray-400">·</span>
                <span>{checkoutUser.email}</span>
                <button
                  onClick={() => {
                    setGuestConfirmed(false)
                    setCheckoutUser(null)
                    localStorage.removeItem("spotix_guest_info")
                  }}
                  className="ml-auto text-xs text-purple-600 hover:underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left column */}
            <div className="space-y-4 sm:space-y-6 w-full">
              <OrderSummary
                eventName={paymentData.eventName}
                cart={isFreeEvent ? [] : [{
                  ticketType:  paymentData.ticketType,
                  quantity:    1,
                  price:       paymentData.ticketPrice,
                  vat:         vatFee,
                }]}
                discountAmount={discountAmount}
                discountData={discountData}
                isFreeEvent={isFreeEvent ?? false}
              />

              {!isFreeEvent && (
                <Discount
                  discountCode={discountCode}
                  setDiscountCode={setDiscountCode}
                  discountData={discountData}
                  setDiscountData={setDiscountData}
                  discountError={discountError}
                  setDiscountError={setDiscountError}
                  discountLoading={discountLoading}
                  onValidateDiscount={validateDiscount}
                />
              )}

              <Referral
                referralData={referralData}
                referralCodes={referralCodes}
                referralFetching={referralFetching}
                referralError={referralError}
                showReferralDropdown={showReferralDropdown}
                setShowReferralDropdown={setShowReferralDropdown}
                onSelectReferral={selectReferral}
                onRemoveReferral={removeReferral}
              />

              {/* Survey form — shown for both logged-in and guest users */}
              <EventSurveyForm
                eventId={paymentData.eventId}
                ticketType={paymentData.ticketType}
                userEmail={checkoutUser?.email}
                userFullName={checkoutUser?.fullName}
                isGuest={!isAuthenticated}
                onFormComplete={(responses, guestInfo) => {
                  setSurveyResponses(responses)
                  setIsSurveyComplete(true)
                  // If guest filled identity inside the survey form, update checkoutUser
                  if (guestInfo && !isAuthenticated) {
                    setCheckoutUser((prev) => prev
                      ? { ...prev, ...guestInfo }
                      : { fullName: guestInfo.fullName, email: guestInfo.email }
                    )
                  }
                }}
                onFormIncomplete={() => setIsSurveyComplete(false)}
              />
            </div>

            {/* Right column */}
            <div className="w-full">
              <PaymentMethods
                selectedMethod={selectedMethod}
                walletBalance={walletBalance}
                isFreeEvent={isFreeEvent ?? false}
                creatingReference={creatingReference}
                isSurveyComplete={isSurveyComplete}
                isSurveyRequired={true}
                isGuest={!isAuthenticated}
                onSelectMethod={handlePaymentMethodSelect}
                onProceed={handleProceedPayment}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Paystack modal */}
      {showPaystackModal && paystackReference && checkoutUser && !isFreeEvent && (
        <PayWithPaystack
          email={checkoutUser.email}
          amount={totalAmount}
          reference={paystackReference}
          metadata={{
            eventId:        paymentData.eventId,
            eventName:      paymentData.eventName,
            ticketType:     paymentData.ticketType,
            ticketPrice:    paymentData.ticketPrice,
            eventCreatorId: paymentData.eventCreatorId,
            userId:         sessionUser?.uid || null,
            isGuest:        !isAuthenticated,
            discountCode:   discountData?.code  || null,
            referralCode:   referralData?.code  || null,
          }}
          onSuccess={handlePaystackSuccess}
          onClose={handlePaystackClose}
        />
      )}

      <Footer />
    </div>
  )
}