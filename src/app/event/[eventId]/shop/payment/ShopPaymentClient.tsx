"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import {
  ArrowLeft,
  Loader,
  CheckCircle2,
  MapPin,
  User,
  Mail,
  Phone,
  Minus,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import { isValidNigerianPhone, sanitizePhoneInput } from "@/utils/phoneValidation"
import { waitForFirebaseUser } from "../../payment/lib/firebase-user"
import PayWithPaystack, { type PayWithPaystackHandle } from "@/components/PayWithPaystack"
import type { MerchPaystackMetadata } from "@/components/lib/merch-payment-utility"
import { useShopCart } from "../lib/useShopCart"
import { updateQuantity, removeFromCart, clearCart } from "../lib/cart"
import type { ShopEventInfo } from "../lib/types"

interface ShopPaymentClientProps {
  eventId: string
  event: ShopEventInfo | null
}

/**
 * Checkout for the whole shop cart (see shop/lib/cart.ts) — the merch
 * equivalent of event/[eventId]/payment/EventPaymentClient.tsx. Same
 * two-step flow the old merch-section.tsx checkout used:
 *   1. "Continue to Payment" — collects buyer info, calls
 *      /api/v1/create-merch-ref, and stores the resulting reference +
 *      server-computed totalAmount (Spotix's fee — whichever side of
 *      the Burden of Fee owes it — plus Paystack's cart-wide fee).
 *   2. "Pay ₦X now" — opens the Paystack widget via PayWithPaystack.
 * Split across two clicks because PayWithPaystack.open() must run
 * synchronously inside a user gesture, but the real amount is only known
 * after step 1's async fetch resolves.
 */
export default function ShopPaymentClient({ eventId, event }: ShopPaymentClientProps) {
  const router = useRouter()
  const { cart, subtotal } = useShopCart(eventId)

  const [buyerFullName, setBuyerFullName] = useState("")
  const [buyerEmail, setBuyerEmail] = useState("")
  const [buyerPhone, setBuyerPhone] = useState("")
  const [buyerAddress, setBuyerAddress] = useState("")
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [orderPlaced, setOrderPlaced] = useState(false)

  const [reference, setReference] = useState<string | null>(null)
  const [payableAmount, setPayableAmount] = useState(0)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const paystackRef = useRef<PayWithPaystackHandle>(null)

  // Prefill buyer details from a signed-in session, if there is one —
  // never blocks guest checkout if there isn't.
  useEffect(() => {
    waitForFirebaseUser().then((firebaseUser) => {
      if (!firebaseUser) return
      setCurrentUserId(firebaseUser.uid)
      if (!buyerEmail && firebaseUser.email) setBuyerEmail(firebaseUser.email)
      if (!buyerFullName && firebaseUser.displayName) setBuyerFullName(firebaseUser.displayName)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })
  }, [])

  const metadata: MerchPaystackMetadata = useMemo(
    () => ({
      eventId,
      eventName: event?.eventName || "",
      eventCreatorId: event?.createdBy || "",
      userId: currentUserId,
      itemCount: cart.length,
    }),
    [eventId, event?.eventName, event?.createdBy, currentUserId, cart.length]
  )

  // Step 1 — collect buyer info, create the reference, learn the real
  // (fee-inclusive) amount to charge.
  const handleContinueToPayment = async () => {
    if (!buyerFullName.trim() || !buyerEmail.trim() || !buyerPhone.trim() || !buyerAddress.trim()) {
      setCheckoutError("Please fill in your name, email, phone number, and delivery address")
      return
    }
    if (!isValidNigerianPhone(buyerPhone)) {
      setPhoneTouched(true)
      setCheckoutError("Please enter a valid Nigerian phone number, e.g. 08012345678")
      return
    }
    if (cart.length === 0) return
    setSubmitting(true)
    setCheckoutError(null)
    try {
      const firebaseUser = await waitForFirebaseUser()
      const idToken = firebaseUser ? await firebaseUser.getIdToken().catch(() => null) : null

      const res = await fetch("/api/v1/create-merch-ref", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          eventId,
          eventCreatorId: event?.createdBy,
          eventName: event?.eventName,
          items: cart.map((l) => ({ listingId: l.id, quantity: l.quantity })),
          userFullName: buyerFullName,
          userEmail: buyerEmail,
          userPhone: buyerPhone,
          buyerAddress,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to start checkout")

      setReference(data.reference)
      setPayableAmount(data.totalAmount)
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Failed to start checkout")
    } finally {
      setSubmitting(false)
    }
  }

  // Step 2 — the actual paid click. Must be a direct user gesture.
  const handlePayNow = () => {
    if (!reference) return
    paystackRef.current?.open(reference, { fullName: buyerFullName, phone: buyerPhone })
  }

  const handlePaySuccess = () => {
    clearCart(eventId)
    setOrderPlaced(true)
    setReference(null)
    setPayableAmount(0)
  }

  const handlePayClose = () => {
    // Buyer closed the widget without paying — the reference is still
    // valid, so just stay on the "ready to pay" step.
  }

  if (!event) {
    return (
      <>
        <UserHeader />
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Event not found</h1>
          <p className="text-gray-500">This event doesn&apos;t exist or has been removed.</p>
        </div>
      </>
    )
  }

  if (orderPlaced) {
    return (
      <>
        <UserHeader />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border-2 border-purple-100 flex flex-col items-center text-center">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Order placed!</h3>
            <p className="text-gray-600 mb-6">
              Thanks, {buyerFullName.split(" ")[0]}! We&apos;ve sent a confirmation to{" "}
              <span className="font-medium">{buyerEmail}</span> with your order details.
            </p>
            <Link
              href={`/event/${eventId}/shop`}
              className="px-6 py-2.5 bg-[#6b2fa5] text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Back to shop
            </Link>
          </div>
        </div>
      </>
    )
  }

  if (cart.length === 0) {
    return (
      <>
        <UserHeader />
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-6">Add something from the shop before checking out.</p>
          <Link
            href={`/event/${eventId}/shop`}
            className="px-6 py-2.5 bg-[#6b2fa5] text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Visit shop
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <UserHeader />
      <div className="min-h-screen bg-gray-50 pb-12">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-[#6b2fa5] transition-colors mb-4"
          >
            <div className="p-2 rounded-full hover:bg-purple-100 transition-colors">
              <ArrowLeft size={20} />
            </div>
            <span className="font-medium">Back</span>
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 border-purple-100 mb-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">Checkout</h1>
            <p className="text-gray-500 text-sm mb-6">{event.eventName}&apos;s shop</p>

            {/* Order summary */}
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Order summary</h2>
            <div className="space-y-3 mb-6">
              {cart.map((line) => (
                <div key={line.id} className="flex items-center gap-3 border border-gray-100 rounded-xl p-3">
                  <img
                    src={line.image || "/placeholder.svg"}
                    alt={line.name}
                    className="w-14 h-14 rounded-lg object-cover bg-gray-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{line.name}</p>
                    <p className="text-[#6b2fa5] font-semibold text-sm">₦{formatNumber(line.price)}</p>
                  </div>
                  {!reference ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(eventId, line.id, line.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-[#6b2fa5]">{line.quantity}</span>
                      <button
                        onClick={() => updateQuantity(eventId, line.id, line.quantity + 1)}
                        disabled={line.quantity >= line.stock}
                        className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        onClick={() => removeFromCart(eventId, line.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50"
                        aria-label="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-gray-500">× {line.quantity}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center border-t border-gray-200 pt-4 mb-6">
              <span className="text-gray-700">Subtotal</span>
              <span className="text-xl font-bold text-[#6b2fa5]">₦{formatNumber(subtotal)}</span>
            </div>

            {/* Buyer details */}
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Delivery details</h2>
            <div className="space-y-3 mb-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Full name"
                  value={buyerFullName}
                  onChange={(e) => setBuyerFullName(e.target.value)}
                  disabled={!!reference}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] disabled:bg-gray-50"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="email"
                  placeholder="Email address"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  disabled={!!reference}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] disabled:bg-gray-50"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="Phone number e.g. 08012345678"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(sanitizePhoneInput(e.target.value))}
                  onBlur={() => setPhoneTouched(true)}
                  disabled={!!reference}
                  aria-invalid={phoneTouched && !!buyerPhone && !isValidNigerianPhone(buyerPhone)}
                  className={`w-full pl-10 pr-3 py-2.5 border rounded-lg text-black focus:outline-none focus:ring-2 disabled:bg-gray-50 ${
                    phoneTouched && buyerPhone && !isValidNigerianPhone(buyerPhone)
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 focus:ring-[#6b2fa5]"
                  }`}
                />
                {phoneTouched && buyerPhone && !isValidNigerianPhone(buyerPhone) && (
                  <p className="text-xs text-red-500 mt-1">
                    Enter a valid Nigerian phone number, e.g. 08012345678
                  </p>
                )}
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
                <textarea
                  placeholder="Delivery address"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  disabled={!!reference}
                  rows={2}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] disabled:bg-gray-50 resize-none"
                />
              </div>
            </div>

            {checkoutError && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {checkoutError}
              </div>
            )}

            {!reference ? (
              <button
                onClick={handleContinueToPayment}
                disabled={submitting}
                className="w-full py-3 px-4 bg-[#6b2fa5] text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader className="w-5 h-5 animate-spin" /> : "Continue to Payment"}
              </button>
            ) : (
              <button
                onClick={handlePayNow}
                className="w-full py-3 px-4 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                Pay ₦{formatNumber(payableAmount)} now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mounted once buyer info is known — opened imperatively by
          handlePayNow(), never auto-opens on its own. */}
      <PayWithPaystack
        ref={paystackRef}
        type="merch"
        email={buyerEmail}
        amount={payableAmount}
        isGuest={!currentUserId}
        userId={currentUserId}
        fullName={buyerFullName}
        phone={buyerPhone}
        metadata={metadata}
        onSuccess={handlePaySuccess}
        onClose={handlePayClose}
      />

      <Footer />
    </>
  )
}
