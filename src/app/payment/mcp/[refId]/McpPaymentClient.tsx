"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Bot, CalendarDays, Loader2, MapPin, Ticket } from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import PayWithPaystack, { type PayWithPaystackHandle } from "@/components/PayWithPaystack"
import PaymentMethodPicker from "@/app/event/[eventId]/payment/components/PaymentMethodPicker"
import { findPaymentMethod, type PaymentMethodId } from "@/lib/paystack/payment-channels"

interface McpTicketType {
  type: string
  quantity: number
  price: number
}

interface McpReference {
  reference: string
  status: "pending" | "successful" | "failed"
  eventId: string
  eventName: string
  eventImage: string
  eventVenue: string
  eventDate: string
  eventStart: string
  eventEnd: string
  eventCreatorId: string
  ticketTypes: McpTicketType[]
  totalTicketCount: number
  ticketPrice: number
  transactionFee: number
  totalAmount: number
  buyerFullName: string
  buyerEmail: string
  buyerPhone: string
  isFree: boolean
}

export default function McpPaymentClient({ refId }: { refId: string }) {
  const router = useRouter()
  const [data, setData] = useState<McpReference | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null)
  const paystackRef = useRef<PayWithPaystackHandle>(null)

  useEffect(() => {
    if (!refId) {
      setError("This payment link is missing a reference. Please ask the assistant to start the order again.")
      setLoading(false)
      return
    }

    fetch(`/api/v1/mcp-ref/${refId}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) {
          setError(res.error || "This payment link is invalid or has expired")
          return
        }
        setData(res)

        // Already paid — no need to show the confirmation/pay flow again.
        if (res.status === "successful") {
          router.replace(`/payment/success?reference=${res.reference}`)
        }
      })
      .catch(() => setError("Unable to load this payment link. Please try again."))
      .finally(() => setLoading(false))
  }, [refId, router])

  const handlePaystackSuccess = (reference: string) => {
    router.push(`/payment/success?reference=${reference}`)
  }

  const handlePaystackClose = () => {
    // PayWithPaystack manages its own abandonment/retry UI internally.
  }

  const handlePay = () => {
    if (!data) return
    const channels = selectedMethod ? findPaymentMethod(selectedMethod).channels : undefined
    paystackRef.current?.open(data.reference, undefined, channels)
  }

  // NOTE: every root wrapper below sets bg-gray-50 explicitly rather than
  // relying on the page/body background. globals.css flips --background
  // to near-black under prefers-color-scheme: dark, and this page (like
  // the rest of the light-themed checkout flow) isn't meant to follow
  // that — without an explicit class here, a visitor in a dark-mode
  // browser saw a black void behind this floating white card.
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <UserHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </main>
        <Footer />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <UserHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 p-8 text-center shadow-sm">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Payment link unavailable</h1>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const firstName = data.buyerFullName?.trim().split(/\s+/)[0] || "there"

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <UserHeader />
      <main className="flex-1 px-4 py-10">
        <div className="max-w-lg mx-auto space-y-6">
          {/* MCP greeting */}
          <div className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3.5">
            <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm text-purple-900 leading-relaxed">
              <span className="font-semibold">Hi {firstName},</span> you&apos;re completing a purchase using the
              Spotix MCP Server. Here&apos;s a summary of your order:
            </p>
          </div>

          {/* Event summary */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {data.eventImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.eventImage} alt={data.eventName} className="w-full h-40 object-cover" />
            )}
            <div className="p-5">
              <h1 className="text-lg font-bold text-gray-900">{data.eventName}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" /> {data.eventDate}
                </span>
                {data.eventVenue && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {data.eventVenue}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Order details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-purple-600" /> Order summary
            </h2>

            <div className="space-y-2.5 text-sm">
              {data.ticketTypes.map((t, i) => (
                <div key={`${t.type}-${i}`} className="flex justify-between text-gray-600">
                  <span>
                    {t.type} <span className="text-gray-400">× {t.quantity}</span>
                  </span>
                  <span className="font-medium text-gray-900">₦{Number(t.price * t.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Name</span>
                <span className="font-medium text-gray-900">{data.buyerFullName}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Email</span>
                <span className="font-medium text-gray-900">{data.buyerEmail}</span>
              </div>
            </div>

            {!data.isFree && (
              <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>₦{Number(data.ticketPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Fee</span>
                  <span>₦{Number(data.transactionFee).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
                  <span>Amount to pay</span>
                  <span>₦{Number(data.totalAmount).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment channel */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">How would you like to pay?</h2>
            <PaymentMethodPicker selectedMethod={selectedMethod} onSelect={setSelectedMethod} />
          </div>

          <button
            onClick={handlePay}
            disabled={!selectedMethod}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3.5 text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {selectedMethod ? `Pay ₦${Number(data.totalAmount).toLocaleString()}` : "Select a payment method"}
          </button>
        </div>
      </main>
      <Footer />

      <PayWithPaystack
        ref={paystackRef}
        type="ticket"
        email={data.buyerEmail}
        amount={data.totalAmount}
        isGuest={true}
        userId={null}
        fullName={data.buyerFullName}
        phone={data.buyerPhone}
        metadata={{
          eventId: data.eventId,
          eventName: data.eventName,
          ticketType: data.ticketTypes.map((t) => t.type).join(", "),
          eventCreatorId: data.eventCreatorId,
          userId: null,
          channel: "mcp",
        }}
        onSuccess={handlePaystackSuccess}
        onClose={handlePaystackClose}
      />
    </div>
  )
}
