"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ShieldCheck, X } from "lucide-react"
import { auth, db } from "../lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import { doc, getDoc } from "firebase/firestore"
import PayWithPaystack from "@/components/PayWithPaystack"
import { calculateVATFee } from "@/utils/priceUtility"

// Import helper components
import OrderSummary from "./helpers/order-summary"
import Discount from "./helpers/discount"
import Referral from "./helpers/referral"
import PaymentMethods from "./helpers/payment-methods"
import EventSurveyForm from "./helpers/event-survey-form"
import GuestCheckoutForm from "./helpers/guest-checkout-form"

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
}

export default function PaymentClient() {
  const router = useRouter()
  const [user, setUser] = useState<any | null>(null)
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

  // Paystack payment state
  const [showPaystackModal, setShowPaystackModal] = useState(false)
  const [paystackReference, setPaystackReference] = useState<string | null>(null)
  const [creatingReference, setCreatingReference] = useState(false)

  // Survey form state
  const [surveyResponses, setSurveyResponses] = useState<Record<string, any> | null>(null)
  const [isSurveyComplete, setIsSurveyComplete] = useState(false)

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        await fetchUserData(currentUser.uid)
        await fetchWalletData(currentUser.uid)
        // Only set loading to false after user data is fetched
        setDataLoading(false)
      } else {
        // Allow guest checkout - don't force redirect
        setUser(null)
        // Don't set dataLoading to false here - let payment data loading handle it
      }
    })

    return () => unsubscribe()
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

  const fetchUserData = async (userId: string) => {
    try {
      const userDocRef = doc(db, "users", userId)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        const data = userDoc.data()
        setUserData({
          fullName: data.fullName || data.username || "Valued Customer",
          username: data.username,
          email: data.email || "",
        })
      }
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

  const fetchWalletData = async (userId: string) => {
    try {
      const response = await fetch("/api/v1/iwss", {
        headers: {
          Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
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

  const createPaymentReference = async () => {
    if (!paymentData || cart.length === 0) return null

    // For guests, userData won't be set from Firestore, but we need guestEmail/guestFullName
    // For authenticated users, userData must be set
    if (user && !userData) return null

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

      // All events (free and paid) use the same reference creation endpoint
      const endpoint = "/api/v1/create-pay-ref"

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
      }

      // For authenticated users, include user data
      if (user && userData) {
        requestBody.userFullName = userData.fullName || "Valued Customer"
        requestBody.userEmail = userData.email
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

      // Only add auth header if user is authenticated
      if (user && auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken()
        headers.Authorization = `Bearer ${idToken}`
      }

      const response = await fetch(endpoint, {
        method: "POST",
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

  const handleProceedPayment = async () => {
    if (!paymentData || !userData) return

    const isFreeEvent = paymentData.ticketPrice === 0

    // Check if survey is complete (only if a survey is actually required for the tickets)
    const hasSurveyRequired = surveyRequiredTickets.size > 0
    if (hasSurveyRequired && !isSurveyComplete && surveyResponses === null) {
      alert("Please complete the event registration form before proceeding.")
      return
    }

    // For free events, create reference and redirect directly to success page.
    // The success page will call the unified /v1/ticket endpoint to generate the ticket.
    if (isFreeEvent) {
      const reference = await createPaymentReference()
      if (!reference) return

      // Submit survey responses if they exist
      if (surveyResponses && Object.keys(surveyResponses).length > 0) {
        try {
          const primaryTicketType = cart.length > 0 ? cart[0].ticketType : paymentData.ticketType
          await fetch("/api/v1/survey/response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: paymentData.eventCreatorId,
              eventId: paymentData.eventId,
              responses: surveyResponses,
              attendeeInfo: {
                fullName: userData.fullName,
                email: userData.email,
                ticketType: primaryTicketType,
              },
            }),
          })
        } catch (error) {
          console.error("Error submitting survey responses:", error)
          // Don't block registration if survey submission fails
        }
      }

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
      surveyResponses: surveyResponses || null,
    }

    // Submit survey responses if they exist
    if (surveyResponses && Object.keys(surveyResponses).length > 0) {
      try {
        await fetch("/api/v1/survey/response", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: paymentData.eventCreatorId,
            eventId: paymentData.eventId,
            responses: surveyResponses,
            attendeeInfo: {
              fullName: userData.fullName,
              email: userData.email,
              ticketType: cart.length > 0 ? cart[0].ticketType : paymentData.ticketType,
            },
          }),
        })
      } catch (error) {
        console.error("Error submitting survey responses:", error)
        // Don't block payment if survey submission fails
      }
    }

    if (selectedMethod === "paystack") {
      const reference = await createPaymentReference()
      if (!reference) return

      setPaystackReference(reference)
      sessionStorage.setItem("paystack_payment_data", JSON.stringify(paymentDataWithExtras))
      setShowPaystackModal(true)
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

  const handlePaystackSuccess = (reference: string) => {
    console.log("Payment successful, reference:", reference)
    router.push(`/payment/success?reference=${reference}`)
  }

  const handlePaystackClose = () => {
    setShowPaystackModal(false)
    setPaystackReference(null)
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

              {/* Event Survey Form */}
              {paymentData && userData && cart.length > 0 && surveyRequiredTickets.size > 0 && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      One or more of the tickets you selected requires you to fill a form
                    </p>
                  </div>
                  <EventSurveyForm
                    eventId={paymentData.eventId}
                    ticketType={cart[0].ticketType}
                    userEmail={userData.email}
                    onFormComplete={(responses) => {
                      setSurveyResponses(responses)
                      setIsSurveyComplete(true)
                    }}
                    onFormIncomplete={() => {
                      setIsSurveyComplete(false)
                    }}
                  />
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
                onProceed={handleProceedPayment}
                onSignIn={handleShowSignIn}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Paystack Payment Modal */}
      {showPaystackModal && paystackReference && userData && !isFreeEvent && (
        <PayWithPaystack
          email={userData.email || ""}
          amount={totalAmount}
          reference={paystackReference}
          isGuest={!user}
          userId={user?.uid || null}
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
