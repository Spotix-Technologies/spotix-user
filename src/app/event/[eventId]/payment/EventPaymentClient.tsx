"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, ShieldCheck, X, FileText } from "lucide-react"
import {
  getSessionUser,
  getAccessToken,
  authFetch,
  type SessionUser,
} from "@/app/lib/auth-client-user"
// NOTE: /api/v1/iwss and /api/v1/create-pay-ref are legacy routes that still
// verify a genuine Firebase ID token server-side (adminAuth.verifyIdToken) —
// they haven't been migrated to the spotix_u_at JWT yet. The login flow
// intentionally keeps a real Firebase client session alive alongside the
// JWT session specifically so these two calls keep working. Everything else
// in this file (who's logged in, profile prefill) now uses the JWT session
// via auth-client-user.ts, matching the booker portal's auth model.
import { auth } from "@/app/lib/firebase"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import PayWithPaystack, { type PayWithPaystackHandle } from "@/components/PayWithPaystack"
import { findPaymentMethod, type PaymentMethodId } from "@/lib/paystack/payment-channels"

// Import helper components straight from the shared /payment route — this
// event-scoped checkout is a thin wrapper around the same building blocks,
// not a fork of them.
import OrderSummary from "@/app/payment/helpers/order-summary"
import Discount from "@/app/payment/helpers/discount"
import Referral from "@/app/payment/helpers/referral"
import SurveyFormDialog from "@/app/payment/helpers/survey-form-dialog"
import { calculateDiscount, type DiscountData } from "@/app/payment/helpers/discount-utils"

// New, event-route-local UI: a real Paystack channel picker (replacing the
// old single generic "Paystack" card) and a dialog-based guest checkout
// (replacing the old full-screen takeover).
import PaymentMethodsPanel, { type SelectedMethod } from "./components/PaymentMethodsPanel"
import GuestCheckoutDialog from "./components/GuestCheckoutDialog"

/** Resolves once Firebase Auth has restored its persisted session (or confirmed there is none). */
function waitForFirebaseUser(): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribe()
      resolve(firebaseUser)
    })
  })
}

interface PaymentData {
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  eventCreatorId: string
  organizerId?: string
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

interface ReferralData {
  code: string
}

interface ReferralCodeOption {
  code: string
}

interface UserData {
  fullName?: string
  username?: string
  email: string
  phoneNumber?: string
}

export default function EventPaymentClient() {
  const router = useRouter()
  const params = useParams<{ eventId: string }>()
  const routeEventId = params?.eventId as string

  const [user, setUser] = useState<SessionUser | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
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

  // Guest checkout state
  const [guestFullName, setGuestFullName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [cart, setCart] = useState<any[]>([])

  // Organizer state
  const [organizerName, setOrganizerName] = useState("")
  const [organizerEmail, setOrganizerEmail] = useState("")
  const [organizerId, setOrganizerId] = useState("")

  // Survey state for multiple tickets
  const [surveyRequiredTickets, setSurveyRequiredTickets] = useState<Set<string>>(new Set())

  // Load cart, organizer, and guest data from localStorage (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCart = JSON.parse(localStorage.getItem("spotix_cart") || "[]")
      setCart(savedCart)

      const organizer = localStorage.getItem("spotix_organizer")
      if (organizer) {
        try {
          const organizerData = JSON.parse(organizer)
          setOrganizerName(organizerData.bookername || "")
          setOrganizerEmail(organizerData.bookeremail || "")
          setOrganizerId(organizerData.organizerId || "")
        } catch (error) {
          console.error("Error parsing organizer data:", error)
        }
      }

      // Load guest data from localStorage if it exists
      const guestData = localStorage.getItem("spotix_guest_checkout")
      if (guestData) {
        try {
          const parsed = JSON.parse(guestData)
          setGuestFullName(parsed.guestFullName || "")
          setGuestEmail(parsed.guestEmail || "")
          setGuestPhone(parsed.guestPhone || "")
        } catch (error) {
          console.error("Error parsing guest data:", error)
        }
      }
    }
  }, [])

  // Mobile-only fix: iOS Safari auto-zooms the viewport when a focused
  // input's font-size is under 16px (see the discount/guest-checkout
  // inputs), and because getting here is a client-side route change (not a
  // full page load), that zoom level carries straight over from whatever
  // page/field the buyer was just on — landing them mid-scroll on a zoomed
  // page instead of at the top. Nudging the viewport meta's content forces
  // Safari to reset scale to 1 on mount; restoring the original content
  // right after keeps pinch-to-zoom working normally for the rest of the
  // visit.
  useEffect(() => {
    if (typeof window === "undefined") return
    window.scrollTo(0, 0)

    const viewportMeta = document.querySelector('meta[name="viewport"]')
    const originalContent = viewportMeta?.getAttribute("content") ?? null
    if (viewportMeta && originalContent) {
      viewportMeta.setAttribute("content", `${originalContent}, maximum-scale=1`)
      const resetTimer = setTimeout(() => {
        viewportMeta.setAttribute("content", originalContent)
      }, 350)
      return () => clearTimeout(resetTimer)
    }
  }, [])

  // Check survey requirements for all ticket types in cart
  useEffect(() => {
    if (!paymentData || cart.length === 0 || !userData) return

    const checkAllTicketsSurveyRequirements = async () => {
      const requiredTickets = new Set<string>()

      try {
        const uniqueTicketTypes = Array.from(new Set(cart.map((item) => item.ticketType)))

        for (const ticketType of uniqueTicketTypes) {
          const response = await fetch(
            `/api/v1/survey?eventId=${paymentData.eventId}&ticketType=${encodeURIComponent(ticketType)}`
          )

          if (response.ok) {
            const result = await response.json()
            if (result.requiresForm) {
              requiredTickets.add(ticketType)
            }
          }
        }

        setSurveyRequiredTickets(requiredTickets)
      } catch (error) {
        console.error("Error checking survey requirements:", error)
      }
    }

    checkAllTicketsSurveyRequirements()
  }, [paymentData, cart, userData])

  // Preload the Paystack inline script as early as possible — as soon as we
  // know this is a paid event, not when the Paystack modal mounts.
  useEffect(() => {
    if (!paymentData || paymentData.ticketPrice === 0) return
    if (typeof window === "undefined" || window.PaystackPop) return
    if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) return

    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    document.body.appendChild(script)
    // Deliberately not removed on unmount — once loaded, window.PaystackPop
    // should stay available for the rest of the checkout session.
  }, [paymentData])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const sessionUser = await getSessionUser()
      if (cancelled) return

      if (sessionUser) {
        setUser(sessionUser)
        await fetchUserData()
        await fetchWalletData()
        setDataLoading(false)
      } else {
        // Allow guest checkout — don't force redirect
        setUser(null)
      }
    }

    init()
    return () => { cancelled = true }
  }, [router])

  useEffect(() => {
    const loadPaymentData = async () => {
      const storedPaymentData = sessionStorage.getItem("spotix_payment_data")

      if (storedPaymentData) {
        try {
          const parsedData = JSON.parse(storedPaymentData)

          const needsEventDetails = !parsedData.eventVenue ||
            !parsedData.eventType ||
            !parsedData.eventDate ||
            !parsedData.bookerName

          if (needsEventDetails && parsedData.eventCreatorId && parsedData.eventId) {
            const completeData = await fetchEventDetails(parsedData.eventCreatorId, parsedData.eventId, parsedData)
            setPaymentData(completeData)
          } else {
            setPaymentData(parsedData)
          }

          if (parsedData.eventId) {
            fetchReferralCodes(parsedData.eventId)
          }

          const storedReferral = sessionStorage.getItem("selected_referral_code")
          if (storedReferral) {
            try {
              const referral = JSON.parse(storedReferral)
              setReferralData(referral)
            } catch (error) {
              console.error("Error parsing stored referral:", error)
            }
          }
        } catch (error) {
          console.error("Error parsing payment data:", error)
          setPaymentData(null)
        }
      } else {
        setPaymentData(null)
      }

      setDataLoading(false)
    }

    // Load payment data for both logged-in users and guests
    loadPaymentData()
  }, [])

  const fetchUserData = async () => {
    try {
      // Never read Firestore directly from the client — go through the
      // Admin-SDK-backed /api/v1/user/me route, same as the rest of the app.
      const res = await authFetch("/api/v1/user/me")
      if (!res.ok) return
      const data = await res.json()
      if (!data.authenticated) return
      setUserData({
        fullName:    data.fullName || data.username || "Valued Customer",
        username:    data.username,
        email:       data.email || "",
        phoneNumber: data.phoneNumber || "",
      })
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }

  const fetchEventDetails = async (
    creatorId: string,
    eventId: string,
    existingData: PaymentData
  ): Promise<PaymentData> => {
    try {
      const response = await fetch(`/api/v1/event?eventId=${eventId}`)

      if (!response.ok) {
        console.error("Failed to fetch event details")
        return existingData
      }

      const result = await response.json()

      if (result.success && result.data) {
        const data = result.data

        return {
          ...existingData,
          eventVenue: data.eventVenue || existingData.eventVenue || "",
          eventType: data.eventType || existingData.eventType || "",
          eventDate: data.eventDate || existingData.eventDate || "",
          eventEndDate: data.eventEndDate || existingData.eventEndDate || "",
          eventStart: data.eventStart || existingData.eventStart || "",
          eventEnd: data.eventEnd || existingData.eventEnd || "",
          stopDate: data.stopDate || existingData.stopDate || "",
          bookerName: data.bookerName || "Event Host",
          bookerEmail: data.bookerEmail || "support@spotix.com.ng",
          organizerId: data.organizerId || existingData.organizerId || "",
        }
      }

      return existingData
    } catch (error) {
      console.error("Error fetching event details:", error)
      return existingData
    }
  }

  const fetchWalletData = async () => {
    try {
      const firebaseUser = await waitForFirebaseUser()
      const response = await fetch("/api/v1/iwss", {
        headers: {
          Authorization: `Bearer ${(await firebaseUser?.getIdToken()) ?? ""}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setWalletBalance(data.balance || 0)
      }
    } catch (error) {
      console.error("Error fetching wallet data:", error)
      setWalletBalance(0)
    }
  }

  const fetchReferralCodes = async (eventId: string) => {
    setReferralFetching(true)
    try {
      const response = await fetch(`/api/v1/referrals?eventId=${eventId}`)
      if (!response.ok) throw new Error("Failed to fetch referral codes")
      const data = await response.json()
      setReferralCodes(data.referrals || [])
    } catch (error) {
      console.error("Error fetching referral codes:", error)
      setReferralError("Failed to load referral codes")
    } finally {
      setReferralFetching(false)
    }
  }

  const validateDiscount = async () => {
    if (!discountCode.trim()) {
      setDiscountError("Please enter a discount code")
      return
    }

    setDiscountLoading(true)
    setDiscountError("")

    try {
      const response = await fetch("/api/v1/discount", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        },
        body: JSON.stringify({
          code: discountCode.trim(),
          eventId: paymentData?.eventId,
          // Lets the API reject/accept codes scoped to specific ticket
          // types (see discountsTab in the booker app) against what's
          // actually in this buyer's cart.
          ticketTypes: Array.from(new Set(cart.map((item) => item.ticketType))),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setDiscountError(data.message || data.error || "Invalid discount code")
        setDiscountData(null)
        return
      }

      setDiscountData({
        id: data.id,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        currentUses: data.currentUses,
        expiryDate: data.expiryDate ?? null,
        applicableTickets: data.applicableTickets ?? null,
      })
      setDiscountError("")
    } catch (error) {
      console.error("Error validating discount:", error)
      setDiscountError("Failed to validate discount code")
      setDiscountData(null)
    } finally {
      setDiscountLoading(false)
    }
  }

  const selectReferral = (code: string) => {
    const selectedReferral: ReferralData = { code }
    setReferralData(selectedReferral)
    sessionStorage.setItem("selected_referral_code", JSON.stringify(selectedReferral))
    setShowReferralDropdown(false)
    setReferralError("")
  }

  const removeReferral = () => {
    setReferralData(null)
    sessionStorage.removeItem("selected_referral_code")
    setReferralError("")
  }

  const handlePaymentMethodSelect = (method: SelectedMethod) => {
    if (!paymentData) return
    const isFreeEvent = paymentData.ticketPrice === 0
    if (isFreeEvent) return
    setSelectedMethod(method)
  }

  const createPaymentReference = async (surveyResponsesOverride?: Record<string, any> | null) => {
    if (!paymentData || cart.length === 0) return null

    // For guests, userData won't be set from Firestore, but we need guestEmail/guestFullName
    // For authenticated users, userData must be set
    if (user && !userData) return null

    const effectiveSurveyResponses =
      surveyResponsesOverride !== undefined ? surveyResponsesOverride : surveyResponses

    setCreatingReference(true)

    try {
      const isFreeEvent = paymentData.ticketPrice === 0

      const subtotalBeforeDiscount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const totalVat = cart.reduce((sum, item) => sum + ((item.vat || 0) * item.quantity), 0)

      const discountAmount = isFreeEvent ? 0 : calculateDiscount(cart, discountData).discountAmount

      const subtotal = subtotalBeforeDiscount - discountAmount
      const totalAmount = subtotal + totalVat

      // Free events use a dedicated route that pre-sets status to "successful"
      const endpoint = isFreeEvent ? "/api/v1/ref/free" : "/api/v1/create-pay-ref"

      const ticketTypes = cart.map((item) => ({
        type: item.ticketType,
        quantity: item.quantity,
        price: item.price,
      }))

      const finalEventCreatorId = organizerId || paymentData.organizerId || paymentData.eventCreatorId

      const requestBody: any = {
        eventId: paymentData.eventId,
        eventCreatorId: finalEventCreatorId,
        ticketTypes: ticketTypes,
        referralCode: referralData?.code || null,
        referralData: referralData || null,
        eventName: paymentData.eventName,
        eventVenue: paymentData.eventVenue || null,
        eventType: paymentData.eventType || null,
        eventDate: paymentData.eventDate || null,
        eventEndDate: paymentData.eventEndDate || null,
        eventStart: paymentData.eventStart || null,
        eventEnd: paymentData.eventEnd || null,
        stopDate: paymentData.stopDate || null,
        bookerName: organizerName || paymentData.bookerName || null,
        bookerEmail: organizerEmail || paymentData.bookerEmail || null,
        // Carried on the reference doc, inert, until the backend delivers it
        // post-payment (v1/lib/ticket/survey-delivery.js).
        surveyResponses: effectiveSurveyResponses || null,
      }

      if (user && userData) {
        requestBody.userFullName = userData.fullName || "Valued Customer"
        requestBody.userEmail = userData.email
        if (userData.phoneNumber) {
          requestBody.userPhone = userData.phoneNumber
        }
      }

      if (!user) {
        let finalGuestEmail = guestEmail
        let finalGuestFullName = guestFullName
        let finalGuestPhone = guestPhone

        if (!finalGuestEmail || !finalGuestFullName) {
          const savedGuestData = localStorage.getItem("spotix_guest_checkout")
          if (savedGuestData) {
            try {
              const parsed = JSON.parse(savedGuestData)
              finalGuestEmail = finalGuestEmail || parsed.guestEmail
              finalGuestFullName = finalGuestFullName || parsed.guestFullName
              finalGuestPhone = finalGuestPhone || parsed.guestPhone
            } catch (error) {
              console.error("Error parsing guest data from localStorage:", error)
            }
          }
        }

        requestBody.userEmail = finalGuestEmail
        requestBody.userFullName = finalGuestFullName
        if (finalGuestPhone) {
          requestBody.userPhone = finalGuestPhone
        }
      }

      requestBody.ticketPrice = isFreeEvent ? 0 : subtotal
      requestBody.totalAmount = isFreeEvent ? 0 : totalAmount
      requestBody.transactionFee = isFreeEvent ? 0 : totalVat
      requestBody.discountAmount = isFreeEvent ? 0 : discountAmount
      requestBody.discountCode = isFreeEvent ? null : (discountData?.code || null)
      requestBody.discountData = isFreeEvent ? null : (discountData || null)

      const headers: any = {
        "Content-Type": "application/json",
      }

      if (user) {
        const firebaseUser = await waitForFirebaseUser()
        const idToken = await firebaseUser?.getIdToken()
        if (idToken) headers.Authorization = `Bearer ${idToken}`
      }

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers,
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create reference")
      }

      const data = await response.json()
      console.log("Reference created:", data.reference)
      return data.reference
    } catch (error) {
      console.error("Error creating reference:", error)
      alert(error instanceof Error ? error.message : "Failed to create reference")
      return null
    } finally {
      setCreatingReference(false)
    }
  }

  /**
   * Does the actual work of creating a reference and moving on to payment.
   */
  const proceedWithPayment = async (surveyResponsesOverride?: Record<string, any> | null) => {
    if (!paymentData || !userData) return

    const isFreeEvent = paymentData.ticketPrice === 0
    const effectiveSurveyResponses =
      surveyResponsesOverride !== undefined ? surveyResponsesOverride : surveyResponses

    // For free events, create reference and redirect directly to success page.
    if (isFreeEvent) {
      const reference = await createPaymentReference(effectiveSurveyResponses)
      if (!reference) return

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
      sessionStorage.setItem("spotix_payment_data", JSON.stringify(paymentDataWithExtras))

      const totalFromCart = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
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
      // A specific Paystack channel (card, bank_transfer, ussd, mobile_money)
      // was picked in PaymentMethodsPanel — restrict the widget to it via
      // the `channels` option, same pattern as spotix-vote's VoteModal.
      const method = findPaymentMethod(selectedMethod as PaymentMethodId)
      if (!method.available) return // Apple Pay guard — button is disabled anyway

      const reference = await createPaymentReference(effectiveSurveyResponses)
      if (!reference) return

      sessionStorage.setItem("paystack_payment_data", JSON.stringify(paymentDataWithExtras))
      // Direct call, still inside this same click-triggered async chain —
      // this is what keeps PaystackPop.openIframe() inside the browser's
      // user-activation window.
      paystackRef.current?.open(reference, undefined, method.channels)
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
    guestInfo?: { fullName: string; email: string }
  ) => {
    setSurveyResponses(responses)
    setIsSurveyComplete(true)
    setShowSurveyDialog(false)
    proceedWithPayment(responses)
  }

  const handleSurveyDialogCancel = () => {
    setShowSurveyDialog(false)
  }

  const handlePaystackSuccess = (reference: string) => {
    console.log("Payment successful, reference:", reference)
    router.push(`/payment/success?reference=${reference}`)
  }

  const handlePaystackClose = () => {
    // PayWithPaystack hides its own overlay internally when this fires;
    // nothing left for EventPaymentClient to reset now that it isn't the
    // one conditionally mounting the modal.
  }

  const handleGuestSubmit = (fullName: string, email: string, phone: string) => {
    setUserData({
      fullName,
      username: fullName.split(" ")[0],
      email,
    })
    setGuestFullName(fullName)
    setGuestEmail(email)
    setGuestPhone(phone)

    if (typeof window !== "undefined") {
      localStorage.setItem("spotix_guest_checkout", JSON.stringify({
        guestFullName: fullName,
        guestEmail: email,
        guestPhone: phone,
      }))
    }
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-8 text-center w-full max-w-md mx-auto">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading Payment Details</h2>
          <p className="text-gray-600">Please wait while we prepare your checkout...</p>
        </div>
      </div>
    )
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-8 text-center w-full max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Session Expired</h2>
          <p className="text-gray-600 mb-6">
            Your payment session has expired or no payment data was found. Please go back to the event page and try
            again.
          </p>
          <button
            onClick={() => router.push(routeEventId ? `/event/${routeEventId}` : "/")}
            className="w-full py-3 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg"
            style={{ background: "#6b2fa5" }}
          >
            Back to Event
          </button>
        </div>
      </div>
    )
  }

  const isFreeEvent = paymentData.ticketPrice === 0

  const surveyTicketType =
    cart.find((item) => surveyRequiredTickets.has(item.ticketType))?.ticketType ??
    cart[0]?.ticketType ??
    ""

  const cartSubtotalBeforeDiscount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartTotalVat = cart.reduce((sum, item) => sum + ((item.vat || 0) * item.quantity), 0)

  const discountAmount = isFreeEvent ? 0 : calculateDiscount(cart, discountData).discountAmount

  const cartSubtotal = cartSubtotalBeforeDiscount - discountAmount
  const totalAmount = cartSubtotal + cartTotalVat

  // Buyer hasn't identified themselves yet (not logged in, hasn't filled
  // the guest form) — the checkout page still renders behind this dialog
  // instead of being replaced by a full-screen takeover.
  const needsGuestIdentity = !user && !userData

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex flex-col">
      <UserHeader />

      <main className="flex-1 w-full">
        <div className="w-full max-w-3xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
          {/* Page Title */}
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-purple-700 transition-colors mb-4"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Event</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#6b2fa5" }}>
                <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
                  {isFreeEvent ? "Complete Registration" : "Secure Checkout"}
                </h1>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600">
                  {isFreeEvent ? "Register for this free event" : "Choose your preferred payment method"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
            {/* Left Column - Event Summary, Discount & Referral */}
            <div className="space-y-4 sm:space-y-6 w-full lg:col-span-2">
              <OrderSummary
                eventName={paymentData.eventName}
                cart={cart}
                discountAmount={discountAmount ?? 0}
                discountData={discountData}
                isFreeEvent={isFreeEvent}
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

              {paymentData && userData && cart.length > 0 && surveyRequiredTickets.size > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      {isSurveyComplete ? "Registration form completed" : "This event requires a short form"}
                    </p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      {isSurveyComplete
                        ? "Your answers were saved. You're all set to continue."
                        : "You'll be asked to fill it in when you continue below."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Payment Methods */}
            <div className="w-full lg:col-span-3">
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
            </div>
          </div>
        </div>
      </main>

      {/* Guest identity dialog — replaces the old full-screen guest form.
          The checkout page renders behind it so the event/order context
          stays visible. */}
      {needsGuestIdentity && (
        <GuestCheckoutDialog
          onSubmitGuest={handleGuestSubmit}
          onShowSignIn={handleShowSignIn}
          onClose={handleGuestDialogClose}
          isLoading={dataLoading}
        />
      )}

      {/* Event Registration Form Dialog */}
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
          fullName={user ? (userData.fullName ?? null) : (guestFullName || null)}
          phone={user ? (userData.phoneNumber || null) : (guestPhone || null)}
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
