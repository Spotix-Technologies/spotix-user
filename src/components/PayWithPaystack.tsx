"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { authFetch } from "@/app/lib/auth-client-user"
import { Loader2, CreditCard, AlertCircle } from "lucide-react"
import AddPhoneNumber from "./Addphonenumber"

interface PayWithPaystackProps {
  email: string
  amount: number
  isGuest?: boolean
  userId?: string | null
  /**
   * Full name of the payer.
   * For logged-in users this is normally passed in from PaymentClient (which
   * already fetched it via /api/v1/user/me). For guests it comes from the
   * checkout form. Only falls back to fetching internally if omitted.
   */
  fullName?: string | null
  /**
   * Phone number of the payer. Same sourcing as fullName above.
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

export interface PayWithPaystackHandle {
  /**
   * Opens the Paystack checkout for the given reference. MUST be called
   * directly from inside a click handler's own (possibly async) function
   * chain — never from a useEffect or a setTimeout. Browsers only treat
   * window/iframe activation as user-initiated when it's invoked
   * synchronously (or via a directly-awaited promise chain) from the
   * original gesture; a React effect reacting to state runs in React's own
   * scheduler, outside that chain, and silently gets blocked even with no
   * artificial delay involved.
   */
  open: (reference: string) => void
}

declare global {
  interface Window {
    PaystackPop: any
  }
}

const PayWithPaystack = forwardRef<PayWithPaystackHandle, PayWithPaystackProps>(
  function PayWithPaystack(
    {
      email,
      amount,
      isGuest = false,
      userId = null,
      fullName: propFullName = null,
      phone: propPhone = null,
      metadata,
      onSuccess,
      onClose,
    },
    ref
  ) {
    // Whether the overlay UI (loading / error / phone-prompt / "opening"
    // screens) should render at all. Stays false — component renders
    // nothing — until open() is actually called, even though the script
    // and profile preloading below happen quietly in the background the
    // whole time the buyer is still on the payment page.
    const [active, setActive] = useState(false)

    const [scriptLoading, setScriptLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Resolved payer identity — populated from Firestore for auth users
    // without a phone prop, or straight from props otherwise.
    const [resolvedFullName, setResolvedFullName] = useState<string | null>(propFullName)
    const [phoneNumber, setPhoneNumber] = useState<string | null>(propPhone)

    const [showPhoneNumberModal, setShowPhoneNumberModal] = useState(false)
    const [checkingProfile, setCheckingProfile] = useState(!isGuest)
    const [scriptLoaded, setScriptLoaded] = useState(false)

    // Holds a reference that came in via open() while we were still waiting
    // on the phone number — so once AddPhoneNumber's own submit click
    // resolves, we can resume directly from THAT click's handler chain
    // instead of an effect.
    const pendingReferenceRef = useRef<string | null>(null)

    // Keep the latest callbacks in refs so doOpen doesn't need them in its
    // dependency array (they're recreated every PaymentClient render).
    const onSuccessRef = useRef(onSuccess)
    const onCloseRef = useRef(onClose)
    useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])
    useEffect(() => { onCloseRef.current = onClose }, [onClose])

    // ── Preload the Paystack inline script ──────────────────────────────
    // PaymentClient already preloads this script as soon as it knows the
    // event is paid, well before the buyer reaches this component — so in
    // the common case window.PaystackPop already exists here on first
    // render. This effect is a safety net for the cases where it doesn't
    // (e.g. this component mounted before PaymentClient's preload effect
    // ran, or the script tag is still mid-flight).
    useEffect(() => {
      if (window.PaystackPop) {
        setScriptLoaded(true)
        setScriptLoading(false)
        return
      }

      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://js.paystack.co/v1/inline.js"]'
      )

      if (existing) {
        // Already being loaded elsewhere (PaymentClient's preload) — just
        // wait for it rather than injecting a second copy.
        const interval = setInterval(() => {
          if (window.PaystackPop) {
            clearInterval(interval)
            setScriptLoaded(true)
            setScriptLoading(false)
          }
        }, 100)
        const timeout = setTimeout(() => {
          clearInterval(interval)
          if (!window.PaystackPop) setScriptLoading(false)
        }, 15000)
        return () => {
          clearInterval(interval)
          clearTimeout(timeout)
        }
      }

      const script = document.createElement("script")
      script.src = "https://js.paystack.co/v1/inline.js"
      script.async = true
      script.onload = () => {
        setScriptLoaded(true)
        setScriptLoading(false)
      }
      script.onerror = () => {
        setScriptLoading(false)
      }
      document.body.appendChild(script)
    }, [])

    // ── Resolve profile for authenticated users ─────────────────────────
    // Skips the fetch entirely if the parent already supplied a phone
    // number (the normal case — see PaymentClient).
    useEffect(() => {
      if (isGuest) {
        setCheckingProfile(false)
        return
      }

      if (propPhone?.trim()) {
        setResolvedFullName(propFullName)
        setPhoneNumber(propPhone.trim())
        setCheckingProfile(false)
        return
      }

      const fetchProfile = async () => {
        try {
          const res = await authFetch("/api/v1/user/me")
          if (!res.ok) {
            setCheckingProfile(false)
            return
          }

          const data = await res.json()
          if (!data.authenticated) {
            setCheckingProfile(false)
            return
          }

          setResolvedFullName(data.fullName || null)

          const phone = data.phoneNumber || null
          if (phone?.trim()) setPhoneNumber(phone.trim())
          setCheckingProfile(false)
        } catch (err) {
          console.error("[PayWithPaystack] Error fetching profile:", err)
          setCheckingProfile(false)
        }
      }

      fetchProfile()
    }, [isGuest, propPhone, propFullName])

    // ── The actual Paystack handoff ──────────────────────────────────────
    // Called directly from open() (i.e. directly from the buyer's click
    // chain) or from handlePhoneNumberAdded (also a direct click chain).
    // Never called from a useEffect.
    const doOpen = useCallback(
      (reference: string, phoneOverride?: string) => {
        setActive(true)
        setError(null)

        if (!window.PaystackPop) {
          setError("Paystack is still loading. Please wait a moment and press Pay Now again.")
          return
        }

        const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
        if (!paystackPublicKey) {
          setError("Payment configuration error. Please contact support.")
          return
        }

        const effectivePhone = phoneOverride ?? phoneNumber
        if (!isGuest && !effectivePhone) {
          // Missing phone — ask for it. Resumes from AddPhoneNumber's own
          // submit click once it's provided.
          pendingReferenceRef.current = reference
          setShowPhoneNumberModal(true)
          return
        }

        const nameParts = (resolvedFullName ?? "").trim().split(/\s+/)
        const firstName = nameParts[0] ?? ""
        const lastName = nameParts.slice(1).join(" ") || firstName

        try {
          const handler = window.PaystackPop.setup({
            key: paystackPublicKey,
            email,
            amount: Math.round(amount * 100), // kobo
            currency: "NGN",
            ref: reference,

            first_name: firstName,
            last_name: lastName,
            phone: effectivePhone ?? "",

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
                  value: effectivePhone ?? "",
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
              onSuccessRef.current(response.reference)
            },
            onClose: () => {
              setActive(false)
              onCloseRef.current()
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
          }
        } catch (err) {
          console.error("[PayWithPaystack] Error initializing payment:", err)
          setError("Failed to initialize payment. Please try again.")
        }
      },
      [email, amount, metadata, resolvedFullName, phoneNumber, isGuest]
    )

    const handlePhoneNumberAdded = (phone: string) => {
      setPhoneNumber(phone)
      setShowPhoneNumberModal(false)

      const pending = pendingReferenceRef.current
      if (pending) {
        pendingReferenceRef.current = null
        // Still inside the "Continue" button's own click chain (see
        // Addphonenumber.tsx's handleSubmit) — safe to open directly here.
        doOpen(pending, phone)
      }
    }

    const handleRetryClose = () => {
      setActive(false)
      onCloseRef.current()
    }

    useImperativeHandle(
      ref,
      () => ({
        open: (reference: string) => doOpen(reference),
      }),
      [doOpen]
    )

    // ── Render ────────────────────────────────────────────────────────
    if (!active) return null

    if (showPhoneNumberModal) {
      return <AddPhoneNumber onPhoneNumberAdded={handlePhoneNumberAdded} onClose={handleRetryClose} />
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
                onClick={handleRetryClose}
                className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setError(null)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )
    }

    // scriptLoading/checkingProfile can only still be true here in the rare
    // case open() was called before background preloading finished — doOpen
    // already surfaced a clear error in that case if the script truly wasn't
    // ready, so this is just the normal "please wait" state.
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-purple-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Opening Payment Gateway...</h3>
            <p className="text-gray-600 mb-6">The Paystack payment window should open shortly</p>
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span className="text-purple-600 text-sm font-medium">Connecting gateway...</span>
            </div>
            <button onClick={handleRetryClose} className="text-sm text-gray-500 hover:text-gray-700 underline">
              Cancel Payment
            </button>
          </div>
        </div>
      </div>
    )
  }
)

export default PayWithPaystack
