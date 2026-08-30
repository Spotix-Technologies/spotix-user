"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
// NOTE: /api/v1/iwss and /api/v1/create-pay-ref are legacy routes that still
// verify a genuine Firebase ID token server-side (adminAuth.verifyIdToken) —
// they haven't been migrated to the spotix_u_at JWT yet. The login flow
// intentionally keeps a real Firebase client session alive alongside the
// JWT session specifically so these two calls keep working. Everything else
// in this file (who's logged in, profile prefill) now uses the JWT session
// via auth-client-user.ts, matching the booker portal's auth model.
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import PayWithPaystack, { type PayWithPaystackHandle } from "@/components/PayWithPaystack"
import { findPaymentMethod, type PaymentMethodId } from "@/lib/paystack/payment-channels"

// Shared /payment route building blocks — this event-scoped checkout is a
// thin wrapper around them, not a fork.
import OrderSummary from "@/app/payment/helpers/order-summary"
import Discount from "@/app/payment/helpers/discount"
import Referral from "@/app/payment/helpers/referral"
import SurveyFormDialog from "@/app/payment/helpers/survey-form-dialog"
import { calculateDiscount, type DiscountData } from "@/app/payment/helpers/discount-utils"
import { computeOrderPricing, resolveFeeBurden } from "@/utils/priceUtility"

// Event-route-local UI
import PaymentMethodsPanel, { type SelectedMethod } from "./components/PaymentMethodsPanel"
import GuestCheckoutDialog from "./components/GuestCheckoutDialog"
import QueueCountdownBanner from "./components/QueueCountdownBanner"
import CheckoutHeader from "./components/CheckoutHeader"
import LoadingScreen from "./components/LoadingScreen"
import SessionExpiredScreen from "./components/SessionExpiredScreen"
import QueueExpiredScreen from "./components/QueueExpiredScreen"
import SurveyStatusNotice from "./components/SurveyStatusNotice"
import PendingPaymentNotice from "./components/PendingPaymentNotice"

import { releaseQueueSlot, queueTokenStorageKey, queueExpiryStorageKey } from "@/app/lib/queue-client"

import { useMobileViewportFix } from "./hooks/useMobileViewportFix"
import { usePaystackScriptPreload } from "./hooks/usePaystackScriptPreload"
import { useStoredCheckoutContext } from "./hooks/useStoredCheckoutContext"
import { useUserSession } from "./hooks/useUserSession"
import { useSurveyRequirements } from "./hooks/useSurveyRequirements"
import { useQueueCheckoutWindow } from "./hooks/useQueueCheckoutWindow"

import { fetchEventDetails, fetchReferralCodes, validateDiscountCode } from "./lib/api"
import { createPaymentReference } from "./lib/create-payment-reference"
import { fetchPaymentStatus, buildRecoveredCheckout } from "./lib/payment-status"
import { setRefInUrl, clearRefFromUrl } from "./lib/url-ref"
import {
  readStoredPaymentData,
  writeStoredPaymentData,
  writePaystackPaymentData,
  readSelectedReferral,
  writeSelectedReferral,
  clearSelectedReferral,
} from "./lib/checkout-storage"
import { PENDING_REFERENCE_POLL_MS } from "./constants"
import type { PaymentData, ReferralData, ReferralCodeOption } from "./types"

export default function EventPaymentClient() {
  const router = useRouter()
  const params = useParams<{ eventId: string }>()
  const searchParams = useSearchParams()
  const routeEventId = params?.eventId as string
  const refFromUrl = searchParams.get("ref")

  const { user, userData, setUserData, walletBalance } = useUserSession()
  const {
    cart,
    setCart,
    organizerName,
    organizerEmail,
    organizerId,
    guestFullName,
    guestEmail,
    guestPhone,
    submitGuest,
  } = useStoredCheckoutContext()

  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<SelectedMethod>(null)
  const [dataLoading, setDataLoading] = useState(true)

  const [discountCode, setDiscountCode] = useState("")
  const [discountLoading, setDiscountLoading] = useState(false)
  const [discountData, setDiscountData] = useState<DiscountData | null>(null)
  const [discountError, setDiscountError] = useState("")

  const [referralCodes, setReferralCodes] = useState<ReferralCodeOption[]>([])
  const [referralFetching, setReferralFetching] = useState(false)
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [referralError, setReferralError] = useState("")
  const [showReferralDropdown, setShowReferralDropdown] = useState(false)

  // Paystack payment — the component is mounted as soon as we know this is
  // a paid event (see render below), so its script/profile preloading has
  // plenty of time to finish before the buyer ever clicks Pay Now. Opening
  // the checkout itself happens via this ref's open() method, called
  // directly from proceedWithPayment's own click-triggered chain — never
  // from a useEffect — so the browser keeps treating it as user-initiated.
  const paystackRef = useRef<PayWithPaystackHandle>(null)
  const [creatingReference, setCreatingReference] = useState(false)

  // Survey form state
  const [surveyResponses, setSurveyResponses] = useState<Record<string, any> | null>(null)
  const [isSurveyComplete, setIsSurveyComplete] = useState(false)
  const [showSurveyDialog, setShowSurveyDialog] = useState(false)

  // ── Pending-reference recovery ────────────────────────────────────────
  // Set once a `?ref=` in the URL resolves to a still-pending reference —
  // see the recovery effect below. While set, "Proceed" reopens this exact
  // reference instead of minting a new one, and totalAmount is pinned to
  // the reference's own confirmed total rather than recomputed from
  // cart+discount (see PendingPaymentNotice).
  const [resumedReference, setResumedReference] = useState<string | null>(null)
  const [resumedTotalAmount, setResumedTotalAmount] = useState<number | null>(null)
  const [recoveryChecking, setRecoveryChecking] = useState(false)
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null)

  const { queueDeadline, queueSecondsLeft, queueExpired } = useQueueCheckoutWindow(paymentData?.eventId)
  const surveyRequiredTickets = useSurveyRequirements(paymentData, cart, userData)

  useMobileViewportFix()
  usePaystackScriptPreload(paymentData)

  // ── Load payment data: normal (sessionStorage) or recovered (?ref=) ────
  useEffect(() => {
    let cancelled = false
    let pollTimer: ReturnType<typeof setInterval> | null = null

    const loadFromSessionStorage = async (): Promise<boolean> => {
      const stored = readStoredPaymentData()
      if (!stored) return false

      const needsEventDetails =
        !stored.eventVenue || !stored.eventType || !stored.eventDate || !stored.bookerName

      const complete =
        needsEventDetails && stored.eventCreatorId && stored.eventId
          ? await fetchEventDetails(stored.eventCreatorId, stored.eventId, stored as PaymentData)
          : (stored as PaymentData)

      if (cancelled) return true
      setPaymentData(complete)
      if (complete.eventId) loadReferralCodes(complete.eventId)

      const storedReferral = readSelectedReferral()
      if (storedReferral) setReferralData(storedReferral)
      return true
    }

    const loadReferralCodes = async (eventId: string) => {
      setReferralFetching(true)
      const { codes, error } = await fetchReferralCodes(eventId)
      if (cancelled) return
      setReferralCodes(codes)
      if (error) setReferralError(error)
      setReferralFetching(false)
    }

    const pollResumedReference = (reference: string) => {
      pollTimer = setInterval(async () => {
        const status = await fetchPaymentStatus(reference)
        if (cancelled || !status?.success) return

        if (status.status === "successful" || status.status === "incorrect_payment") {
          if (pollTimer) clearInterval(pollTimer)
          router.replace(`/payment/success?reference=${reference}`)
          return
        }
        if (status.status === "failed") {
          if (pollTimer) clearInterval(pollTimer)
          setResumedReference(null)
          setResumedTotalAmount(null)
          clearRefFromUrl(router)
          setRecoveryNotice("Your last payment attempt didn't go through. Please try again.")
        }
      }, PENDING_REFERENCE_POLL_MS)
    }

    const init = async () => {
      if (!refFromUrl) {
        await loadFromSessionStorage()
        if (!cancelled) setDataLoading(false)
        return
      }

      // A `?ref=` is present — this is a resumed / refreshed checkout.
      setRecoveryChecking(true)
      const status = await fetchPaymentStatus(refFromUrl)
      if (cancelled) return

      if (!status?.success) {
        // Unknown/expired reference — drop it and fall back to normal load.
        clearRefFromUrl(router)
        setRecoveryChecking(false)
        await loadFromSessionStorage()
        if (!cancelled) setDataLoading(false)
        return
      }

      if (status.status === "successful" || status.status === "incorrect_payment") {
        router.replace(`/payment/success?reference=${refFromUrl}`)
        return // navigating away — keep the loading screen up
      }

      if (status.status === "failed") {
        clearRefFromUrl(router)
        setRecoveryChecking(false)
        setRecoveryNotice("Your last payment attempt didn't go through. Please try again.")
        await loadFromSessionStorage()
        if (!cancelled) setDataLoading(false)
        return
      }

      // status.status === "pending" — the core resume case.
      setResumedReference(refFromUrl)
      setResumedTotalAmount(status.totalAmount ?? 0)

      const hadStoredData = await loadFromSessionStorage()
      if (cancelled) return

      if (!hadStoredData) {
        // sessionStorage didn't survive — rebuild from the reference itself.
        const recovered = buildRecoveredCheckout(status)
        if (recovered) {
          setPaymentData(recovered.paymentData)
          setCart(recovered.cart)
        }
      }

      setRecoveryChecking(false)
      setDataLoading(false)
      pollResumedReference(refFromUrl)
    }

    init()
    return () => {
      cancelled = true
      if (pollTimer) clearInterval(pollTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refFromUrl])

  const validateDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError("Please enter a discount code")
      return
    }
    setDiscountLoading(true)
    setDiscountError("")

    const result = await validateDiscountCode({
      code: discountCode.trim(),
      eventId: paymentData?.eventId,
      ticketTypes: Array.from(new Set(cart.map((item) => item.ticketType))),
    })

    if ("error" in result) {
      setDiscountError(result.error)
      setDiscountData(null)
    } else {
      setDiscountData(result.data)
      setDiscountError("")
      // A different discount changes the total — a resumed reference's
      // amount is locked, so it's no longer safe to reopen as-is.
      abandonResumedReference()
    }
    setDiscountLoading(false)
  }

  const selectReferral = (code: string) => {
    const selected: ReferralData = { code }
    setReferralData(selected)
    writeSelectedReferral(selected)
    setShowReferralDropdown(false)
    setReferralError("")
    abandonResumedReference()
  }

  const removeReferral = () => {
    setReferralData(null)
    clearSelectedReferral()
    setReferralError("")
    abandonResumedReference()
  }

  const abandonResumedReference = () => {
    if (!resumedReference) return
    setResumedReference(null)
    setResumedTotalAmount(null)
    clearRefFromUrl(router)
  }

  const handlePaymentMethodSelect = (method: SelectedMethod) => {
    if (!paymentData) return
    if (paymentData.ticketPrice === 0) return
    setSelectedMethod(method)
  }

  const doCreatePaymentReference = async (surveyResponsesOverride?: Record<string, any> | null) => {
    if (!paymentData || cart.length === 0) return null
    const effectiveSurveyResponses =
      surveyResponsesOverride !== undefined ? surveyResponsesOverride : surveyResponses

    setCreatingReference(true)
    const result = await createPaymentReference({
      paymentData,
      cart,
      discountData,
      referralData,
      organizer: { organizerId, organizerName, organizerEmail },
      user,
      userData,
      guest: { guestFullName, guestEmail, guestPhone },
      surveyResponses: effectiveSurveyResponses,
    })
    setCreatingReference(false)

    if ("error" in result) {
      alert(result.error)
      return null
    }
    return result.reference
  }

  /** Does the actual work of creating a reference and moving on to payment. */
  const proceedWithPayment = async (surveyResponsesOverride?: Record<string, any> | null) => {
    if (!paymentData || !userData) return

    const isFreeEvent = paymentData.ticketPrice === 0
    const effectiveSurveyResponses =
      surveyResponsesOverride !== undefined ? surveyResponsesOverride : surveyResponses

    // For free events, create reference and redirect directly to success page.
    if (isFreeEvent) {
      const reference = await doCreatePaymentReference(effectiveSurveyResponses)
      if (!reference) return
      releaseQueueSlotIfHeld()
      router.push(`/payment/success?reference=${reference}`)
      return
    }

    const paymentDataWithExtras = {
      ...paymentData,
      discountCode: discountData?.code || null,
      discountData: discountData || null,
      referralCode: referralData?.code || null,
      referralData: referralData || null,
      userFullName: userData.fullName || "Valued Customer",
      userEmail: userData.email,
      surveyResponses: effectiveSurveyResponses || null,
    }

    if (selectedMethod === "wallet") {
      writeStoredPaymentData(paymentDataWithExtras)
      const totalFromCart = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const walletParams = new URLSearchParams({
        eventId: paymentData.eventId,
        eventName: paymentData.eventName,
        ticketPrice: totalFromCart.toString(),
        eventCreatorId: organizerId || paymentData.eventCreatorId,
        cart: JSON.stringify(cart),
      })
      router.push(`/payment/wallet?${walletParams.toString()}`)
      return
    }

    if (selectedMethod) {
      const method = findPaymentMethod(selectedMethod as PaymentMethodId)
      if (!method.available) return // Apple Pay guard — button is disabled anyway

      const reference = await doCreatePaymentReference(effectiveSurveyResponses)
      if (!reference) return

      writePaystackPaymentData(paymentDataWithExtras)
      setRefInUrl(router, reference)
      // Direct call, still inside this same click-triggered async chain —
      // this is what keeps PaystackPop.openIframe() inside the browser's
      // user-activation window.
      paystackRef.current?.open(reference, undefined, method.channels)
    }
  }

  /** Reopens the exact reference recovered from `?ref=` — never re-creates it. */
  const completeResumedPayment = () => {
    if (!resumedReference) return
    paystackRef.current?.open(resumedReference)
  }

  const releaseQueueSlotIfHeld = () => {
    if (typeof window === "undefined" || !paymentData) return
    const qToken = sessionStorage.getItem(queueTokenStorageKey(paymentData.eventId))
    if (qToken) {
      releaseQueueSlot(paymentData.eventId, qToken)
      sessionStorage.removeItem(queueTokenStorageKey(paymentData.eventId))
      sessionStorage.removeItem(queueExpiryStorageKey(paymentData.eventId))
    }
  }

  const handleProceedClick = () => {
    if (!paymentData || !userData) return

    const hasSurveyRequired = surveyRequiredTickets.size > 0
    if (hasSurveyRequired && !isSurveyComplete) {
      setShowSurveyDialog(true)
      return
    }
    proceedWithPayment()
  }

  const handleSurveyDialogComplete = (
    responses: Record<string, any>,
    _guestInfo?: { fullName: string; email: string }
  ) => {
    setSurveyResponses(responses)
    setIsSurveyComplete(true)
    setShowSurveyDialog(false)
    proceedWithPayment(responses)
  }

  const handleSurveyDialogCancel = () => setShowSurveyDialog(false)

  const handlePaystackSuccess = (reference: string) => {
    releaseQueueSlotIfHeld()
    router.push(`/payment/success?reference=${reference}`)
  }

  const handlePaystackClose = () => {
    // PayWithPaystack hides its own overlay internally when this fires;
    // nothing left for EventPaymentClient to reset now that it isn't the
    // one conditionally mounting the modal.
  }

  const handleGuestSubmit = (fullName: string, email: string, phone: string) => {
    setUserData({ fullName, username: fullName.split(" ")[0], email })
    submitGuest(fullName, email, phone)
  }

  const handleShowSignIn = () => {
    const eventIdForReturn = paymentData?.eventId || routeEventId
    const returnTo = `/event/${eventIdForReturn}/payment?from_guest_checkout=true`
    router.push(`/auth/login?return_to=${encodeURIComponent(returnTo)}`)
  }

  const handleGuestDialogClose = () => {
    // Can't check out without an identity — send them back to the event
    // page rather than stranding them on an unusable checkout screen.
    router.back()
  }

  if (dataLoading) {
    return (
      <LoadingScreen
        title={recoveryChecking ? "Checking Your Payment" : "Loading Payment Details"}
        message={
          recoveryChecking
            ? "Confirming the status of your last payment attempt…"
            : "Please wait while we prepare your checkout..."
        }
      />
    )
  }

  if (!paymentData) {
    return <SessionExpiredScreen onBackToEvent={() => router.push(routeEventId ? `/event/${routeEventId}` : "/")} />
  }

  if (queueExpired) {
    const handleRejoinQueue = () => {
      const eventId = paymentData.eventId
      sessionStorage.removeItem(queueTokenStorageKey(eventId))
      sessionStorage.removeItem(queueExpiryStorageKey(eventId))
      router.push(`/event/${eventId}/queue`)
    }
    return <QueueExpiredScreen onRejoinQueue={handleRejoinQueue} />
  }

  const isFreeEvent = paymentData.ticketPrice === 0

  const surveyTicketType =
    cart.find((item) => surveyRequiredTickets.has(item.ticketType))?.ticketType ?? cart[0]?.ticketType ?? ""

  const cartSubtotalBeforeDiscount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartTotalVat = cart.reduce((sum, item) => sum + (item.vat || 0) * item.quantity, 0)
  const discountAmount = isFreeEvent ? 0 : calculateDiscount(cart, discountData).discountAmount
  const cartSubtotal = cartSubtotalBeforeDiscount - discountAmount
  const totalTicketCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Spotix's fee, Paystack's fee, and addons — resolved together against
  // this event's Burden of Fee setting. paymentData.feeBurden/addons are a
  // snapshot from whenever the buyer clicked "Buy"; create-pay-ref is what
  // actually enforces this server-side and may freeze a different (more
  // current) snapshot on the Reference — this is only what's *shown* here.
  const orderPricing = computeOrderPricing({
    ticketSubtotal: cartSubtotal,
    totalTicketCount,
    spotixFeeTotal: cartTotalVat,
    feeBurden: paymentData.feeBurden ?? resolveFeeBurden(null),
    addons: paymentData.addons ?? [],
  })
  const computedTotalAmount = orderPricing.totalPayable

  // While resuming a pending reference, the amount is pinned to what the
  // backend already confirmed for it — never recomputed from cart/discount.
  const totalAmount = resumedReference && resumedTotalAmount !== null ? resumedTotalAmount : computedTotalAmount

  // Buyer hasn't identified themselves yet (not logged in, hasn't filled
  // the guest form) — the checkout page still renders behind this dialog
  // instead of being replaced by a full-screen takeover. Skipped entirely
  // while resuming: reopening an existing reference never needs identity.
  const needsGuestIdentity = !user && !userData && !resumedReference

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex flex-col">
      <UserHeader />

      <main className="flex-1 w-full">
        <div className="w-full max-w-3xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          {queueDeadline !== null && queueSecondsLeft !== null && (
            <QueueCountdownBanner queueSecondsLeft={queueSecondsLeft} />
          )}

          {recoveryNotice && !resumedReference && (
            <div className="mb-6 rounded-xl px-4 py-3 text-sm font-medium bg-amber-50 text-amber-800 border border-amber-200">
              {recoveryNotice}
            </div>
          )}

          <CheckoutHeader isFreeEvent={isFreeEvent} onBack={() => router.back()} />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
            {/* Left Column - Event Summary, Discount & Referral */}
            <div className="space-y-4 sm:space-y-6 w-full lg:col-span-2">
              <OrderSummary
                eventName={paymentData.eventName}
                cart={cart}
                discountAmount={resumedReference ? 0 : discountAmount ?? 0}
                discountData={resumedReference ? null : discountData}
                isFreeEvent={isFreeEvent}
                orderPricing={resumedReference ? null : orderPricing}
              />

              {!isFreeEvent && !resumedReference && (
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

              {!resumedReference && (
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
              )}

              {paymentData && userData && cart.length > 0 && surveyRequiredTickets.size > 0 && !resumedReference && (
                <SurveyStatusNotice isSurveyComplete={isSurveyComplete} />
              )}
            </div>

            {/* Right Column - Payment Methods */}
            <div className="w-full lg:col-span-3">
              {resumedReference ? (
                <PendingPaymentNotice
                  reference={resumedReference}
                  totalAmount={totalAmount}
                  checking={recoveryChecking}
                  canReopen={!!userData?.email}
                  onCompletePayment={completeResumedPayment}
                  onStartFresh={abandonResumedReference}
                />
              ) : (
                <PaymentMethodsPanel
                  selectedMethod={selectedMethod}
                  walletBalance={walletBalance}
                  isFreeEvent={isFreeEvent}
                  creatingReference={creatingReference}
                  isSurveyComplete={isSurveyComplete}
                  isSurveyRequired={surveyRequiredTickets.size > 0}
                  isGuest={!user}
                  totalAmount={totalAmount}
                  onSelectMethod={handlePaymentMethodSelect}
                  onProceed={handleProceedClick}
                  onSignIn={handleShowSignIn}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {needsGuestIdentity && (
        <GuestCheckoutDialog
          onSubmitGuest={handleGuestSubmit}
          onShowSignIn={handleShowSignIn}
          onClose={handleGuestDialogClose}
          isLoading={dataLoading}
        />
      )}

      {showSurveyDialog && paymentData && userData && (
        <SurveyFormDialog
          eventId={paymentData.eventId}
          ticketType={surveyTicketType}
          userEmail={userData.email}
          userFullName={userData.fullName}
          onComplete={handleSurveyDialogComplete}
          onCancel={handleSurveyDialogCancel}
        />
      )}

      {/* Paystack — mounted as early as possible (as soon as we know this is
          a paid event and who's paying) so its script + profile preloading
          finish in the background well before the buyer clicks Proceed. */}
      {paymentData && userData && !isFreeEvent && (
        <PayWithPaystack
          ref={paystackRef}
          type="ticket"
          email={userData.email || ""}
          amount={totalAmount}
          isGuest={!user}
          userId={user?.uid || null}
          fullName={user ? userData.fullName ?? null : guestFullName || null}
          phone={user ? userData.phoneNumber || null : guestPhone || null}
          metadata={{
            eventId: paymentData.eventId,
            eventName: paymentData.eventName,
            ticketPrice: paymentData.ticketPrice,
            cart: JSON.stringify(cart),
            eventCreatorId: organizerId || paymentData.eventCreatorId,
            userId: user?.uid || null,
            discountCode: discountData?.code || null,
            referralCode: referralData?.code || null,
          }}
          onSuccess={handlePaystackSuccess}
          onClose={handlePaystackClose}
        />
      )}

      <Footer />
    </div>
  )
}
