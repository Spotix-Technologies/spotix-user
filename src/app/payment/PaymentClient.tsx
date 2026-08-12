"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
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
import { auth } from "../lib/firebase"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import PayWithPaystack, { type PayWithPaystackHandle } from "@/components/PayWithPaystack"
import { calculateVATFee } from "@/utils/priceUtility"

// Import helper components
import OrderSummary from "./helpers/order-summary"
import Discount from "./helpers/discount"
import Referral from "./helpers/referral"
import PaymentMethods from "./helpers/payment-methods"
import SurveyFormDialog from "./helpers/survey-form-dialog"
import GuestCheckoutForm from "./helpers/guest-checkout-form"

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

interface UserData {
  fullName?: string
  username?: string
  email: string
  phoneNumber?: string
}

export default function PaymentClient() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
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
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [cart, setCart] = useState<any[]>([])

  // Organizer state
  const [organizerName, setOrganizerName] = useState("")
  const [organizerEmail, setOrganizerEmail] = useState("")
  const [organizerId, setOrganizerId] = useState("")

  // Survey state for multiple tickets
  const [surveyRequiredTickets, setSurveyRequiredTickets] = useState<Set<string>>(new Set())
  const [checkingSurveyRequirements, setCheckingSurveyRequirements] = useState(false)

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

  // Check survey requirements for all ticket types in cart
  useEffect(() => {
    if (!paymentData || cart.length === 0 || !userData) return

    const checkAllTicketsSurveyRequirements = async () => {
      setCheckingSurveyRequirements(true)
      const requiredTickets = new Set<string>()

      try {
        // Check each unique ticket type in cart
        const uniqueTicketTypes = Array.from(new Set(cart.map(item => item.ticketType)))

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
      } finally {
        setCheckingSurveyRequirements(false)
      }
    }

    checkAllTicketsSurveyRequirements()
  }, [paymentData, cart, userData])

  // Preload the Paystack inline script as early as possible — as soon as we
  // know this is a paid event, not when the Paystack modal mounts. Without
  // this, the script only starts downloading *after* the buyer clicks Pay
  // Now, which was one more network hop sitting between the click and
  // PaystackPop.openIframe(). window.PaystackPop being ready ahead of time
  // means the only network work left in the click's chain is creating the
  // payment reference.
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
      // Use the JWT session (same system the booker portal uses) instead of
      // Firebase onAuthStateChanged — our JWT is the source of truth for
      // "is this person logged in", not Firebase client auth state.
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
      // Use the new flat structure API
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
          // Discount validation must keep working for guests — only attach
          // the Authorization header when we actually have a session token.
          // (Cookies are also sent automatically via same-origin credentials.)
          ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
        },
        body: JSON.stringify({
          code: discountCode.trim(),
          eventId: paymentData?.eventId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setDiscountError(data.message || "Invalid discount code")
        setDiscountData(null)
        return
      }

      setDiscountData(data)
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

  const handlePaymentMethodSelect = (method: string) => {
    if (!paymentData) return
    const isFreeEvent = paymentData.ticketPrice === 0

    if (isFreeEvent && (method === "paystack" || method === "agent")) {
      return
    }

    setSelectedMethod(method)
  }

  const createPaymentReference = async (surveyResponsesOverride?: Record<string, any> | null) => {
    if (!paymentData || cart.length === 0) return null

    // For guests, userData won't be set from Firestore, but we need guestEmail/guestFullName
    // For authenticated users, userData must be set
    if (user && !userData) return null

    // The override lets callers (e.g. the survey dialog's onComplete handler)
    // pass freshly-collected responses straight through without waiting on
    // a setState to flush — relying on the `surveyResponses` state here
    // alone would race and send `null` on the very first proceed attempt.
    const effectiveSurveyResponses =
      surveyResponsesOverride !== undefined ? surveyResponsesOverride : surveyResponses

    setCreatingReference(true)

    try {
      const isFreeEvent = paymentData.ticketPrice === 0

      // Calculate totals from cart items
      const subtotalBeforeDiscount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const totalVat = cart.reduce((sum, item) => sum + ((item.vat || 0) * item.quantity), 0)

      let discountAmount = 0
      if (discountData && !isFreeEvent) {
        if (discountData.discountType === "percentage") {
          discountAmount = (subtotalBeforeDiscount * discountData.discountValue) / 100
        } else {
          discountAmount = discountData.discountValue
        }
      }

      const subtotal = subtotalBeforeDiscount - discountAmount
      const totalAmount = subtotal + totalVat

      // Free events use a dedicated route that pre-sets status to "successful"
      const endpoint = isFreeEvent ? "/api/v1/ref/free" : "/api/v1/create-pay-ref"

      // Create array of ticket types with quantities
      const ticketTypes = cart.map(item => ({
        type: item.ticketType,
        quantity: item.quantity,
        price: item.price,
      }))

      // Use organizerId from localStorage, then from paymentData, then from eventCreatorId
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
        // post-payment (v1/lib/ticket/survey-delivery.js). We no longer POST
        // this to /api/v1/survey/response ourselves — see proceedWithPayment.
        surveyResponses: effectiveSurveyResponses || null,
      }

      // For authenticated users, include user data
      if (user && userData) {
        requestBody.userFullName = userData.fullName || "Valued Customer"
        requestBody.userEmail = userData.email
        // Phone can be optional
        if (userData.phoneNumber) {
          requestBody.userPhone = userData.phoneNumber
        }
      }

      // For guests, map guest data to user fields (not guest fields)
      // This way guests are treated like users in the backend
      if (!user) {
        // Use state variables first, but fall back to localStorage if empty
        let finalGuestEmail = guestEmail
        let finalGuestFullName = guestFullName
        let finalGuestPhone = guestPhone

        // If state variables are empty, try to load from localStorage
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

        // Map guest data to user fields for consistency
        requestBody.userEmail = finalGuestEmail
        requestBody.userFullName = finalGuestFullName
        // Phone can be optional
        if (finalGuestPhone) {
          requestBody.userPhone = finalGuestPhone
        }
      }

      // Always include payment fields; they will be 0 for free events
      requestBody.ticketPrice = isFreeEvent ? 0 : subtotalBeforeDiscount
      requestBody.totalAmount = isFreeEvent ? 0 : totalAmount
      requestBody.transactionFee = isFreeEvent ? 0 : totalVat
      requestBody.discountAmount = isFreeEvent ? 0 : discountAmount
      requestBody.discountCode = isFreeEvent ? null : (discountData?.code || null)
      requestBody.discountData = isFreeEvent ? null : (discountData || null)

      const headers: any = {
        "Content-Type": "application/json",
      }

      // /api/v1/create-pay-ref (and /api/v1/ref/free) still verify a real
      // Firebase ID token server-side — only add this for logged-in users;
      // guests must still be able to create a reference.
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
   * Accepts an optional survey-responses override so the dialog's
   * onComplete handler can hand off freshly-collected answers without
   * waiting on setSurveyResponses to flush through a render.
   */
  const proceedWithPayment = async (surveyResponsesOverride?: Record<string, any> | null) => {
    if (!paymentData || !userData) return

    const isFreeEvent = paymentData.ticketPrice === 0
    const effectiveSurveyResponses =
      surveyResponsesOverride !== undefined ? surveyResponsesOverride : surveyResponses

    // For free events, create reference and redirect directly to success page.
    // The success page will call the unified /v1/ticket endpoint to generate the ticket.
    if (isFreeEvent) {
      const reference = await createPaymentReference(effectiveSurveyResponses)
      if (!reference) return

      // Survey responses (if any) were already attached to the reference doc
      // inside createPaymentReference() above. They're delivered by the
      // backend's ticket-generation pipeline once the ticket actually
      // exists — never submitted from here, so an abandoned/failed
      // registration can no longer leave orphaned survey data behind.

      // Redirect to success — PaystackSuccessClient will call /v1/ticket to generate the ticket
      router.push(`/payment/success?reference=${reference}`)
      return
    }

    // For paid events, continue with payment method selection
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

    // Survey responses travel inside paymentDataWithExtras (sessionStorage,
    // used by the wallet/agent/bitcoin flows below) and were already
    // attached to the reference doc by createPaymentReference() for the
    // Paystack flow. Either way, delivery happens backend-side, post-payment
    // — see v1/lib/ticket/survey-delivery.js. We deliberately don't POST to
    // /api/v1/survey/response here anymore: doing so before payment
    // succeeded is exactly what let survey data through for buyers who
    // never actually paid.

    if (selectedMethod === "paystack") {
      const reference = await createPaymentReference(effectiveSurveyResponses)
      if (!reference) return

      sessionStorage.setItem("paystack_payment_data", JSON.stringify(paymentDataWithExtras))
      // Direct call, still inside this same click-triggered async chain —
      // this is what keeps PaystackPop.openIframe() inside the browser's
      // user-activation window. See PayWithPaystackHandle for why this
      // can't go through a useEffect instead.
      paystackRef.current?.open(reference)
    } else {
      sessionStorage.setItem("spotix_payment_data", JSON.stringify(paymentDataWithExtras))

      // Calculate total from cart
      const totalFromCart = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const params = new URLSearchParams({
        eventId: paymentData.eventId,
        eventName: paymentData.eventName,
        ticketPrice: totalFromCart.toString(),
        eventCreatorId: organizerId || paymentData.eventCreatorId,
        cart: JSON.stringify(cart),
      })

      switch (selectedMethod) {
        case "wallet":
          router.push(`/payment/wallet?${params.toString()}`)
          break
        case "agent":
          router.push(`/payment/agent?${params.toString()}`)
          break
        case "bitcoin":
          router.push(`/payment/bitcoin?${params.toString()}`)
          break
      }
    }
  }

  /**
   * Entry point wired to the "Proceed" button. If the selected ticket type
   * requires a form and it hasn't been filled yet, opens the form in a
   * dialog instead of proceeding straight to payment. Otherwise proceeds
   * immediately.
   */
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
    // nothing left for PaymentClient to reset now that it isn't the one
    // conditionally mounting the modal.
  }

  const handleGuestSubmit = (fullName: string, email: string, phone: string) => {
    // Set guest user data
    setUserData({
      fullName,
      username: fullName.split(" ")[0],
      email,
    })
    // Also set guest state variables for API call
    setGuestFullName(fullName)
    setGuestEmail(email)
    setGuestPhone(phone)

    // Persist guest data to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("spotix_guest_checkout", JSON.stringify({
        guestFullName: fullName,
        guestEmail: email,
        guestPhone: phone,
      }))
    }

    setShowGuestForm(false)
  }

  const handleShowSignIn = () => {
    // Redirect to sign in page with return_to parameter
    const returnTo = `/payment?from_guest_checkout=true`
    router.push(`/auth/login?return_to=${encodeURIComponent(returnTo)}`)
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
            onClick={() => router.push("/")}
            className="w-full py-3 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg"
            style={{ background: "#6b2fa5" }}
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  // Show guest form if user is not authenticated and we have payment data
  if (!user && paymentData && !userData) {
    return (
      <GuestCheckoutForm
        onSubmitGuest={handleGuestSubmit}
        onShowSignIn={handleShowSignIn}
        isLoading={dataLoading}
      />
    )
  }

// AFTER
const isFreeEvent = paymentData.ticketPrice === 0

// Which ticket type's form to show. Previously this always used cart[0],
// which meant that if a *different* item in the cart was the one flagged
// as requiring a form, the form would silently never appear. Pick the
// first cart item that's actually in the required set, falling back to
// cart[0] only if nothing matched (shouldn't happen once required).
const surveyTicketType =
  cart.find((item) => surveyRequiredTickets.has(item.ticketType))?.ticketType ??
  cart[0]?.ticketType ??
  ""

const cartSubtotalBeforeDiscount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
const cartTotalVat = cart.reduce((sum, item) => sum + ((item.vat || 0) * item.quantity), 0)

let discountAmount = 0
if (discountData && !isFreeEvent) {
  if (discountData.discountType === "percentage") {
    discountAmount = (cartSubtotalBeforeDiscount * discountData.discountValue) / 100
  } else {
    discountAmount = discountData.discountValue
  }
}

const cartSubtotal = cartSubtotalBeforeDiscount - discountAmount
const totalAmount = cartSubtotal + cartTotalVat

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex flex-col">
      <UserHeader />

      <main className="flex-1 w-full">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Page Title */}
          <div className="mb-6 sm:mb-8">
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
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 break-words">
                  {isFreeEvent ? "Complete Registration" : "Secure Checkout"}
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  {isFreeEvent ? "Register for this free event" : "Choose your preferred payment method"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Left Column - Event Summary, Discount & Referral */}
            <div className="space-y-4 sm:space-y-6 w-full">
              <OrderSummary
                eventName={paymentData.eventName}
                cart={cart}
                discountAmount={discountAmount ?? 0}
                discountData={discountData}
                // totalAmount={totalAmount ?? 0}
                isFreeEvent={isFreeEvent}
              />

              {/* Only show discount for paid events */}
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

              {/* Event Survey notice — the form itself opens in a dialog when
                  the buyer clicks Proceed, so we don't block or clutter this
                  column with the full form. */}
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
            <div className="w-full">
              <PaymentMethods
                selectedMethod={selectedMethod}
                walletBalance={walletBalance}
                isFreeEvent={isFreeEvent}
                creatingReference={creatingReference}
                isSurveyComplete={isSurveyComplete}
                isSurveyRequired={surveyRequiredTickets.size > 0}
                isGuest={!user}
                onSelectMethod={handlePaymentMethodSelect}
                onProceed={handleProceedClick}
                onSignIn={handleShowSignIn}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Event Registration Form Dialog — opens when the buyer clicks
          Proceed/Register and the selected ticket type requires a form. */}
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
          finish in the background well before the buyer clicks Pay Now. It
          renders nothing until paystackRef.current.open(reference) is
          called from proceedWithPayment. */}
      {paymentData && userData && !isFreeEvent && (
        <PayWithPaystack
          ref={paystackRef}
          type="ticket"
          email={userData.email || ""}
          amount={totalAmount}
          isGuest={!user}
          userId={user?.uid || null}
          // Pass name + phone so Paystack prefills the checkout form. We
          // already have both from the /api/v1/user/me call above (or from
          // the guest checkout form) — passing them in lets PayWithPaystack
          // skip its own post-click profile fetch entirely.
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
