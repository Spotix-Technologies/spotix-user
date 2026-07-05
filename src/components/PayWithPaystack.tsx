"use client"

import { useState, useEffect, useCallback } from "react"
import { authFetch } from "@/app/lib/auth-client-user"
import { Loader2, CreditCard, AlertCircle } from "lucide-react"
import AddPhoneNumber from "./Addphonenumber"

interface PayWithPaystackProps {
  email: string
  amount: number
  reference: string
  isGuest?: boolean
  userId?: string | null
  /**
   * Full name of the payer.
   * For logged-in users this is pulled from /api/v1/user/me inside the component.
   * For guests it should be passed in directly from the checkout form.
   */
  fullName?: string | null
  /**
   * Phone number of the payer.
   * For logged-in users this is pulled from /api/v1/user/me inside the component.
   * For guests it should be passed in directly from the checkout form.
   */
  phone?: string | null
  metadata: {
    eventId: string
    eventName: string
    ticketType?: string
    ticketPrice: number
    eventCreatorId: string
    userId?: string | null
    discountCode?: string | null
    referralCode?: string | null
    [key: string]: any
  }
  onSuccess: (reference: string) => void
  onClose: () => void
}

declare global {
  interface Window {
    PaystackPop: any
  }
}

export default function PayWithPaystack({
  email,
  amount,
  reference,
  isGuest = false,
  userId = null,
  fullName: propFullName = null,
  phone: propPhone = null,
  metadata,
  onSuccess,
  onClose,
}: PayWithPaystackProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Resolved payer identity — populated from Firestore for auth users,
  // or from props for guests.
  const [resolvedFullName, setResolvedFullName] = useState<string | null>(propFullName)
  const [phoneNumber, setPhoneNumber] = useState<string | null>(propPhone)

  const [showPhoneNumberModal, setShowPhoneNumberModal] = useState(false)
  const [checkingProfile, setCheckingProfile] = useState(!isGuest)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [paymentInitialized, setPaymentInitialized] = useState(false)

  // Load Paystack inline script
  useEffect(() => {
    if (window.PaystackPop) {
      setScriptLoaded(true)
      setLoading(false)
      return
    }

    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    script.onload = () => {
      setScriptLoaded(true)
      setLoading(false)
    }
    script.onerror = () => {
      setError("Failed to load Paystack. Please check your internet connection.")
      setLoading(false)
    }
    document.body.appendChild(script)

    return () => {
      if (script.parentNode) document.body.removeChild(script)
    }
  }, [])

  // Resolve profile for authenticated users 
  useEffect(() => {
    if (isGuest) {
      // Props already set; nothing to fetch
      setCheckingProfile(false)
      return
    }

    const fetchProfile = async () => {
      try {
        // Don't use Firebase client auth state here — the app's real
        // session is the spotix_u_at JWT cookie. Same endpoint used by the
        // payment page and vote modal for prefilling logged-in users.
        const res = await authFetch("/api/v1/user/me")
        if (!res.ok) {
          setError("You must be logged in to proceed")
          setCheckingProfile(false)
          return
        }

        const data = await res.json()
        if (!data.authenticated) {
          setError("You must be logged in to proceed")
          setCheckingProfile(false)
          return
        }

        const name = data.fullName || null
        setResolvedFullName(name)

        const phone = data.phoneNumber || null
        if (phone?.trim()) {
          setPhoneNumber(phone.trim())
          setCheckingProfile(false)
        } else {
          // No phone — ask for one before proceeding
          setShowPhoneNumberModal(true)
          setCheckingProfile(false)
        }
      } catch (err) {
        console.error("[PayWithPaystack] Error fetching profile:", err)
        setError("Failed to verify your information. Please try again.")
        setCheckingProfile(false)
      }
    }

    fetchProfile()
  }, [isGuest])

  const handlePhoneNumberAdded = (phone: string) => {
    setPhoneNumber(phone)
    setShowPhoneNumberModal(false)
  }

  // ── Initialize Paystack ────────────────────────────────────────────────────
  const initializePayment = useCallback(() => {
    if (!window.PaystackPop) {
      setError("Paystack is not loaded. Please refresh the page.")
      return
    }

    const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    if (!paystackPublicKey) {
      setError("Payment configuration error. Please contact support.")
      return
    }

    // Split fullName into first/last for Paystack prefill
    const nameParts = (resolvedFullName ?? "").trim().split(/\s+/)
    const firstName = nameParts[0] ?? ""
    const lastName  = nameParts.slice(1).join(" ") || firstName

    try {
      const handler = window.PaystackPop.setup({
        key: paystackPublicKey,
        email,
        amount: Math.round(amount * 100), // kobo
        currency: "NGN",
        ref: reference,

        // ── Payer prefill — THIS was the missing fix ───────────────────────
        first_name: firstName,
        last_name:  lastName,
        phone:      phoneNumber ?? "",
        // ──────────────────────────────────────────────────────────────────

        metadata: {
          custom_fields: [
            {
              display_name: "Transaction Type",
              variable_name: "type",
              value: "ticket_purchase",
            },
            {
              display_name: "Full Name",
              variable_name: "full_name",
              value: resolvedFullName ?? "",
            },
            {
              display_name: "Phone Number",
              variable_name: "phone_number",
              value: phoneNumber ?? "",
            },
            {
              display_name: "Event Name",
              variable_name: "event_name",
              value: metadata.eventName,
            },
            ...(metadata.ticketType
              ? [
                  {
                    display_name: "Ticket Type",
                    variable_name: "ticket_type",
                    value: metadata.ticketType,
                  },
                ]
              : []),
            {
              display_name: "Event ID",
              variable_name: "event_id",
              value: metadata.eventId,
            },
            {
              display_name: "Event Creator",
              variable_name: "event_creator_id",
              value: metadata.eventCreatorId,
            },
            {
              display_name: "User ID",
              variable_name: "user_id",
              value: metadata.userId ?? "",
            },
            ...(metadata.discountCode
              ? [
                  {
                    display_name: "Discount Code",
                    variable_name: "discount_code",
                    value: metadata.discountCode,
                  },
                ]
              : []),
            ...(metadata.referralCode
              ? [
                  {
                    display_name: "Referral Code",
                    variable_name: "referral_code",
                    value: metadata.referralCode,
                  },
                ]
              : []),
          ],
        },

        callback: (response: any) => {
          onSuccess(response.reference)
        },
        onClose: () => {
          onClose()
        },
      })

      if (!handler) {
        setError("Failed to initialize Paystack. Please refresh and try again.")
        return
      }

      if (typeof handler.openIframe === "function") {
        handler.openIframe()
      } else if (typeof handler.pay === "function") {
        handler.pay()
      } else {
        setError("Failed to open payment modal. Please try again.")
        return
      }

      setPaymentInitialized(true)
    } catch (err) {
      console.error("[PayWithPaystack] Error initializing payment:", err)
      setError("Failed to initialize payment. Please try again.")
    }
  }, [email, amount, reference, resolvedFullName, phoneNumber, metadata, onSuccess, onClose])

  // Auto-initialize when everything is ready
  useEffect(() => {
    if (scriptLoaded && !checkingProfile && phoneNumber && !error && !paymentInitialized) {
      initializePayment()
    }
  }, [scriptLoaded, checkingProfile, phoneNumber, error, paymentInitialized, initializePayment])

  // ── Render states ──────────────────────────────────────────────────────────

  if (showPhoneNumberModal) {
    return <AddPhoneNumber onPhoneNumberAdded={handlePhoneNumberAdded} onClose={onClose} />
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Payment Error</h3>
              <p className="text-sm text-gray-600">Something went wrong</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                setPaymentInitialized(false)
                window.location.reload()
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading || checkingProfile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {checkingProfile ? "Verifying Information..." : "Initializing Payment..."}
            </h3>
            <p className="text-gray-600 mb-6">
              {checkingProfile
                ? "Please wait while we verify your details"
                : "Please wait while we connect to Paystack"}
            </p>
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
              <span className="text-purple-600 font-medium">
                {checkingProfile ? "Checking..." : "Loading..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
            <CreditCard className="w-8 h-8 text-purple-600 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Opening Payment Gateway...</h3>
          <p className="text-gray-600 mb-6">The Paystack payment window should open shortly</p>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 underline">
            Cancel Payment
          </button>
        </div>
      </div>
    </div>
  )
}
