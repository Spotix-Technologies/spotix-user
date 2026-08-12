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
import { Loader2, CreditCard, AlertCircle, RotateCcw } from "lucide-react"
import AddPhoneNumber from "./Addphonenumber"
import { ensurePaystackScriptLoaded, isPaystackReady, exactAmountNotice, upsertPaystackCustomer, splitFullName } from "./lib/paystack-shared"
import { ticketWithPaystack, type TicketPaystackMetadata } from "./lib/ticket-payment-utility"
import { voteWithPaystack, type VotePaystackMetadata } from "./lib/vote-payment-utility"

type PayWithPaystackBaseProps = {
  email: string
  amount: number
  isGuest?: boolean
  userId?: string | null
  /**
   * Full name of the payer.
   * For logged-in users this is normally passed in from the caller (which
   * already fetched it via /api/v1/user/me). For guests it comes from the
   * checkout/vote form. Only falls back to fetching internally if omitted
   * (ticket flow only — see the profile-resolution effect below).
   */
  fullName?: string | null
  /**
   * Phone number of the payer. Same sourcing as fullName above.
   */
  phone?: string | null
  onSuccess: (reference: string) => void
  onClose: () => void
}

type PayWithPaystackProps =
  | (PayWithPaystackBaseProps & { type: "ticket"; metadata: TicketPaystackMetadata })
  | (PayWithPaystackBaseProps & { type: "vote"; metadata: VotePaystackMetadata })

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
   *
   * `identity`, when passed, overrides fullName/phone for this call —
   * needed because callers like VoteModal resolve the real payer identity
   * (e.g. from POST /api/v1/vote/payref) and then call open() synchronously
   * in the same click handler, right after setState-ing that identity into
   * their own component. React hasn't re-rendered this component with the
   * new fullName/phone props by the time that same-tick open() call runs —
   * so without an explicit override, PayWithPaystack would still be working
   * off whatever fullName/phone it was first mounted with (usually null,
   * since it's mounted early for script preloading, well before identity
   * is known). Passing the resolved values straight into open() sidesteps
   * that render-timing gap entirely. Omit it to fall back to props/state
   * (fine for the ticket flow, where PayWithPaystack isn't mounted until
   * userData — and therefore fullName/phone — is already resolved).
   */
  open: (reference: string, identity?: { fullName?: string | null; phone?: string | null }) => void
}

declare global {
  interface Window {
    PaystackPop: any
  }
}

// How long the "kindly transfer exactly ₦X" notice stays on screen before
// the Paystack widget opens automatically.
const AMOUNT_NOTICE_DELAY_MS = 1500

type Stage = "confirm" | "connecting" | "phone-prompt" | "abandoned" | "error"

const PayWithPaystack = forwardRef<PayWithPaystackHandle, PayWithPaystackProps>(
  function PayWithPaystack(
    {
      type,
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
    // Whether the overlay UI should render at all. Stays false until
    // open() is actually called, even though script + profile preloading
    // below happen quietly in the background the whole time the buyer is
    // still on the payment page.
    const [active, setActive] = useState(false)
    const [stage, setStage] = useState<Stage>("confirm")

    const [error, setError] = useState<string | null>(null)

    // Resolved payer identity — populated from Firestore for auth ticket
    // buyers without a phone prop, or straight from props otherwise.
    const [resolvedFullName, setResolvedFullName] = useState<string | null>(propFullName)
    const [phoneNumber, setPhoneNumber] = useState<string | null>(propPhone)

    const [checkingProfile, setCheckingProfile] = useState(!isGuest && type === "ticket")

    // Holds the reference currently being paid for — used both by the
    // amount-notice → auto-open timer and by the "Have another go?" retry
    // after an abandoned attempt.
    const pendingReferenceRef = useRef<string | null>(null)
    const pendingPhoneOverrideRef = useRef<string | null>(null)
    // Mirrors pendingPhoneOverrideRef, but for fullName — carries an
    // explicit identity.fullName passed into open() through the
    // phone-prompt / abandoned-retry detours, which otherwise only
    // re-invoke openWidget() with the phone override.
    const pendingFullNameOverrideRef = useRef<string | null | undefined>(undefined)
    const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Keep the latest callbacks in refs so openWidget doesn't need them in
    // its dependency array (they're recreated every parent render).
    const onSuccessRef = useRef(onSuccess)
    const onCloseRef = useRef(onClose)
    useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])
    useEffect(() => { onCloseRef.current = onClose }, [onClose])

    // ── Preload the Paystack inline script ──────────────────────────────
    // Callers often preload this script themselves as soon as they know a
    // payment is coming — this effect is just a safety net for cases
    // where it hasn't loaded yet by the time open() is called.
    useEffect(() => {
      ensurePaystackScriptLoaded()
    }, [])

    // ── Resolve profile for authenticated ticket buyers ─────────────────
    // Skips the fetch entirely if the parent already supplied a phone
    // number (the normal case), and skips it entirely for the vote flow
    // (VoteModal always passes fullName/phone in directly).
    useEffect(() => {
      if (type !== "ticket" || isGuest) {
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
          if (!res.ok) { setCheckingProfile(false); return }

          const data = await res.json()
          if (!data.authenticated) { setCheckingProfile(false); return }

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
    }, [type, isGuest, propPhone, propFullName])

    // ── The actual Paystack handoff ──────────────────────────────────────
    // Delegates config-building to ticketWithPaystack / voteWithPaystack
    // (src/components/lib) based on `type`. Never called from a
    // useEffect — only from doOpen's own timer (started synchronously
    // inside the original click) or a fresh "Have another go?" click.
    const openWidget = useCallback(
      (reference: string, phoneOverride?: string, fullNameOverride?: string | null) => {
        if (!isPaystackReady()) {
          setError("Paystack is still loading. Please wait a moment and press Pay Now again.")
          setStage("error")
          return
        }

        const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
        if (!paystackPublicKey) {
          setError("Payment configuration error. Please contact support.")
          setStage("error")
          return
        }

        const effectivePhone = phoneOverride ?? phoneNumber
        const effectiveFullName = fullNameOverride !== undefined ? fullNameOverride : resolvedFullName

        if (!isGuest && !effectivePhone) {
          // Missing phone — ask for it. Resumes from AddPhoneNumber's own
          // submit click once it's provided.
          pendingReferenceRef.current = reference
          setStage("phone-prompt")
          return
        }

        setStage("connecting")

        // Fire-and-forget: gets the buyer's actual name attached to their
        // Paystack Customer record (see upsertPaystackCustomer's own docs
        // for why PaystackPop.setup()'s first_name/last_name alone don't
        // do this). Never awaited — must not delay opening the widget.
        const { firstName, lastName } = splitFullName(effectiveFullName)
        upsertPaystackCustomer(email, firstName, lastName, effectivePhone ?? undefined)

        const shared = {
          paystackKey: paystackPublicKey,
          email,
          amount,
          reference,
          fullName: effectiveFullName ?? "",
          phone: effectivePhone ?? "",
          onSuccess: (ref: string) => {
            setActive(false)
            onSuccessRef.current(ref)
          },
          onClose: () => {
            // Open-aware: the buyer closed the Paystack widget without
            // completing payment. Don't hide silently — offer a retry.
            setStage("abandoned")
            onCloseRef.current()
          },
        }

        try {
          const handler =
            type === "vote"
              ? voteWithPaystack({ ...shared, metadata: metadata as VotePaystackMetadata })
              : ticketWithPaystack({ ...shared, metadata: metadata as TicketPaystackMetadata })

          if (!handler) {
            setError("Failed to initialize Paystack. Please refresh and try again.")
            setStage("error")
            return
          }

          if (typeof handler.openIframe === "function") {
            handler.openIframe()
          } else if (typeof handler.pay === "function") {
            handler.pay()
          } else {
            setError("Failed to open payment modal. Please try again.")
            setStage("error")
          }
        } catch (err) {
          console.error("[PayWithPaystack] Error initializing payment:", err)
          setError("Failed to initialize payment. Please try again.")
          setStage("error")
        }
      },
      [type, email, amount, metadata, resolvedFullName, phoneNumber, isGuest]
    )

    // Entry point — called from the ref handle inside the buyer's click
    // chain. Shows the "transfer exactly ₦X" notice for a moment, then
    // opens the widget automatically.
    const doOpen = useCallback(
      (reference: string, phoneOverride?: string, fullNameOverride?: string | null) => {
        setActive(true)
        setError(null)
        pendingReferenceRef.current = reference
        pendingPhoneOverrideRef.current = phoneOverride ?? null
        pendingFullNameOverrideRef.current = fullNameOverride

        // Keep resolvedFullName state in sync with any explicit override too
        // — harmless for the ticket flow (fullNameOverride is never passed
        // there), and means anything reading resolvedFullName later in this
        // render (e.g. the "connecting" stage's UI) reflects reality.
        if (fullNameOverride !== undefined) setResolvedFullName(fullNameOverride)

        const effectivePhone = phoneOverride ?? phoneNumber
        const effectiveFullName = fullNameOverride !== undefined ? fullNameOverride : resolvedFullName

        if (!isGuest && !effectivePhone) {
          pendingReferenceRef.current = reference
          setStage("phone-prompt")
          return
        }

        setStage("confirm")
        // Fire early (in parallel with the amount-notice countdown below)
        // so Paystack has as much of a head start as possible attaching
        // the buyer's real name to their Customer record before checkout
        // opens. openWidget() fires this again once any phone-prompt flow
        // resolves, as a safety net — the call is idempotent either way.
        const { firstName, lastName } = splitFullName(effectiveFullName)
        upsertPaystackCustomer(email, firstName, lastName, effectivePhone ?? undefined)

        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
        confirmTimerRef.current = setTimeout(() => {
          openWidget(reference, phoneOverride, fullNameOverride)
        }, AMOUNT_NOTICE_DELAY_MS)
      },
      [openWidget, isGuest, phoneNumber, resolvedFullName, email]
    )

    useEffect(() => {
      return () => {
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      }
    }, [])

    const handlePhoneNumberAdded = (phone: string) => {
      setPhoneNumber(phone)
      pendingPhoneOverrideRef.current = phone

      const pending = pendingReferenceRef.current
      if (pending) {
        // Still inside the "Continue" button's own click chain (see
        // Addphonenumber.tsx's handleSubmit) — safe to show the amount
        // notice and schedule the auto-open directly here.
        setStage("confirm")
        if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
        confirmTimerRef.current = setTimeout(() => {
          openWidget(pending, phone, pendingFullNameOverrideRef.current)
        }, AMOUNT_NOTICE_DELAY_MS)
      }
    }

    const handleRetryAfterAbandon = () => {
      // Fresh click — safe to open Paystack directly.
      const pending = pendingReferenceRef.current
      if (pending) {
        openWidget(pending, pendingPhoneOverrideRef.current ?? undefined, pendingFullNameOverrideRef.current)
      }
    }

    const handleFullClose = () => {
      setActive(false)
      onCloseRef.current()
    }

    useImperativeHandle(
      ref,
      () => ({
        open: (reference: string, identity?: { fullName?: string | null; phone?: string | null }) =>
          doOpen(reference, identity?.phone ?? undefined, identity?.fullName),
      }),
      [doOpen]
    )

    // ── Render ────────────────────────────────────────────────────────
    if (!active) return null

    if (stage === "phone-prompt") {
      return <AddPhoneNumber onPhoneNumberAdded={handlePhoneNumberAdded} onClose={handleFullClose} />
    }

    if (stage === "abandoned") {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Payment Not Completed</h3>
                <p className="text-sm text-gray-600">The window was closed early</p>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
              <p className="text-orange-800 text-sm">
                Oops, looks like you closed the modal without completing the payment. Have another go?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleFullClose}
                className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRetryAfterAbandon}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )
    }

    if (stage === "error" && error) {
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
                onClick={handleFullClose}
                className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setError(null); handleRetryAfterAbandon() }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )
    }

    // "confirm" (showing the exact-amount notice, about to auto-open) or
    // "connecting" (Paystack handler.openIframe()/pay() just fired).
    // checkingProfile can only still be true here in the rare case open()
    // was called before background profile preloading finished.
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-purple-600 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {stage === "confirm" ? "Almost there…" : "Opening Payment Gateway…"}
            </h3>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 w-full">
              <p className="text-sm text-purple-800 font-medium">{exactAmountNotice(amount)}</p>
            </div>
            <p className="text-gray-600 mb-6 text-sm">The Paystack payment window will open shortly</p>
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
              <span className="text-purple-600 text-sm font-medium">
                {checkingProfile ? "Preparing your details…" : "Connecting gateway…"}
              </span>
            </div>
            <button onClick={handleFullClose} className="text-sm text-gray-500 hover:text-gray-700 underline">
              Cancel Payment
            </button>
          </div>
        </div>
      </div>
    )
  }
)

export default PayWithPaystack
