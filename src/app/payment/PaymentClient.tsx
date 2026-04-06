"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ShieldCheck, X } from "lucide-react"
import { auth, db } from "../lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"
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

  const cart = JSON.parse(localStorage.getItem("spotix_cart") || "[]")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser)
        await fetchUserData(currentUser.uid)
        await fetchWalletData(currentUser.uid)
      } else {
        // Allow guest checkout - don't force redirect
        setUser(null)
        setDataLoading(false)
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

          if (parsedData.eventCreatorId && parsedData.eventId) {
            fetchReferralCodes(parsedData.eventCreatorId, parsedData.eventId)
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
      const eventDocRef = doc(db, "events", creatorId, "userEvents", eventId)
      const eventDoc = await getDoc(eventDocRef)

      if (eventDoc.exists()) {
        const data = eventDoc.data()

        const bookerDocRef = doc(db, "users", creatorId)
        const bookerDoc = await getDoc(bookerDocRef)
        let bookerName = "Event Host"
        let bookerEmail = "support@spotix.com.ng"

        if (bookerDoc.exists()) {
          const bookerData = bookerDoc.data()
          bookerName = bookerData.bookerName || bookerData.fullName || "Event Host"
          bookerEmail = bookerData.email || "support@spotix.com.ng"
        }

        return {
          ...existingData,
          eventVenue: data.eventVenue || existingData.eventVenue || "",
          eventType: data.eventType || existingData.eventType || "",
          eventDate: data.eventDate || existingData.eventDate || "",
          eventEndDate: data.eventEndDate || existingData.eventEndDate || "",
          eventStart: data.eventStart || existingData.eventStart || "",
          eventEnd: data.eventEnd || existingData.eventEnd || "",
          stopDate: data.enableStopDate ? data.stopDate : existingData.stopDate,
          bookerName: bookerName,
          bookerEmail: bookerEmail,
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

  const fetchReferralCodes = async (eventCreatorId: string, eventId: string) => {
    setReferralFetching(true)
    try {
      const referralsCollectionRef = collection(db, "events", eventCreatorId, "userEvents", eventId, "referrals")
      const snapshot = await getDocs(referralsCollectionRef)

      const referrals: ReferralCodeOption[] = []
      snapshot.forEach((docSnap) => {
        referrals.push({
          code: docSnap.id,
        })
      })

      setReferralCodes(referrals)
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
    if (!paymentData || !user || !userData) return null

    setCreatingReference(true)

    try {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) {
        throw new Error("Authentication required")
      }

      const isFreeEvent = paymentData.ticketPrice === 0

      let discountAmount = 0
      if (discountData && !isFreeEvent) {
        if (discountData.discountType === "percentage") {
          discountAmount = (paymentData.ticketPrice * discountData.discountValue) / 100
        } else {
          discountAmount = discountData.discountValue
        }
      }

      const subtotal = paymentData.ticketPrice - discountAmount
      const vatFee = isFreeEvent ? 0 : calculateVATFee(Number(paymentData.ticketPrice))
      const totalAmount = subtotal + vatFee

      // Use different endpoint for free events
      const endpoint = isFreeEvent ? "/api/v1/ref/free" : "/api/v1/create-pay-ref"

      const requestBody: any = {
        eventId: paymentData.eventId,
        eventCreatorId: paymentData.eventCreatorId,
        ticketType: paymentData.ticketType,
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
        bookerName: paymentData.bookerName || null,
        bookerEmail: paymentData.bookerEmail || null,
        userFullName: userData.fullName || "Valued Customer",
        userEmail: userData.email,
      }

      // Add payment-specific fields only for paid events
      if (!isFreeEvent) {
        requestBody.ticketPrice = paymentData.ticketPrice
        requestBody.totalAmount = totalAmount
        requestBody.transactionFee = vatFee
        requestBody.discountCode = discountData?.code || null
        requestBody.discountData = discountData || null
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
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

    // Check if survey is complete (if required)
    if (!isSurveyComplete && surveyResponses === null) {
      alert("Please complete the event registration form before proceeding.")
      return
    }

    // For free events, create reference and redirect to success
    if (isFreeEvent) {
      const reference = await createPaymentReference()
      if (!reference) return

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
                ticketType: paymentData.ticketType,
              },
            }),
          })
        } catch (error) {
          console.error("Error submitting survey responses:", error)
          // Don't block payment if survey submission fails
        }
      }

      // Call the free ticket generation endpoint
      try {
        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
        const response = await fetch(`${BACKEND_URL}/v1/ticket/free`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reference }),
        })

        if (response.ok) {
          router.push(`/payment/success?reference=${reference}`)
        } else {
          alert("Failed to generate free ticket. Please try again.")
        }
      } catch (error) {
        console.error("Error generating free ticket:", error)
        alert("Failed to generate free ticket. Please try again.")
      }
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
              ticketType: paymentData.ticketType,
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

      const params = new URLSearchParams({
        eventId: paymentData.eventId,
        eventName: paymentData.eventName,
        ticketType: paymentData.ticketType,
        ticketPrice: paymentData.ticketPrice.toString(),
        eventCreatorId: paymentData.eventCreatorId,
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

  const isFreeEvent = paymentData.ticketPrice === 0
  const vatFee = isFreeEvent ? 0 : calculateVATFee(Number(paymentData.ticketPrice))

  let discountAmount = 0
  if (discountData && !isFreeEvent) {
    if (discountData.discountType === "percentage") {
      discountAmount = (paymentData.ticketPrice * discountData.discountValue) / 100
    } else {
      discountAmount = discountData.discountValue
    }
  }

  const subtotal = paymentData.ticketPrice - discountAmount
  const totalAmount = subtotal + vatFee

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
              {paymentData && userData && (
                <EventSurveyForm
                  userId={paymentData.eventCreatorId}
                  eventId={paymentData.eventId}
                  ticketType={paymentData.ticketType}
                  userEmail={userData.email}
                  onFormComplete={(responses) => {
                    setSurveyResponses(responses)
                    setIsSurveyComplete(true)
                  }}
                  onFormIncomplete={() => {
                    setIsSurveyComplete(false)
                  }}
                />
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
                onSelectMethod={handlePaymentMethodSelect}
                onProceed={handleProceedPayment}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Paystack Payment Modal */}
      {showPaystackModal && paystackReference && user && !isFreeEvent && (
        <PayWithPaystack
          email={user.email || ""}
          amount={totalAmount}
          reference={paystackReference}
          metadata={{
            eventId: paymentData.eventId,
            eventName: paymentData.eventName,
            ticketType: paymentData.ticketType,
            ticketPrice: paymentData.ticketPrice,
            eventCreatorId: paymentData.eventCreatorId,
            userId: user.uid,
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
