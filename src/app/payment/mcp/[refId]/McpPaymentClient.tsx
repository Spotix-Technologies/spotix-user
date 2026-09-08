"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import PayWithPaystack, { type PayWithPaystackHandle } from "@/components/PayWithPaystack"
import PaymentMethodPicker from "@/app/event/[eventId]/payment/components/PaymentMethodPicker"
import { findPaymentMethod, type PaymentMethodId } from "@/lib/paystack/payment-channels"
import { formatNumber } from "@/utils/formatter"

import McpGreetingBanner from "./components/McpGreetingBanner"
import EventSummaryCard from "./components/EventSummaryCard"
import OrderDetailsCard from "./components/OrderDetailsCard"

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
      {/* Same container width as the event checkout flow (max-w-3xl,
          widening to xl:max-w-6xl) so this page uses the page width
          properly on large screens instead of floating as a narrow
          max-w-lg card in a sea of empty gray. */}
      <main className="flex-1 w-full">
        <div className="w-full max-w-3xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 space-y-6">
          <McpGreetingBanner firstName={firstName} />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
            {/* Left column — event + order details */}
            <div className="space-y-4 sm:space-y-6 w-full lg:col-span-2">
              <EventSummaryCard
                eventName={data.eventName}
                eventImage={data.eventImage}
                eventDate={data.eventDate}
                eventVenue={data.eventVenue}
              />
              <OrderDetailsCard
                ticketTypes={data.ticketTypes}
                buyerFullName={data.buyerFullName}
                buyerEmail={data.buyerEmail}
                isFree={data.isFree}
                ticketPrice={data.ticketPrice}
                transactionFee={data.transactionFee}
                totalAmount={data.totalAmount}
              />
            </div>

            {/* Right column — payment method + pay button */}
            <div className="w-full lg:col-span-3">
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-gray-900">How would you like to pay?</h2>
                <PaymentMethodPicker selectedMethod={selectedMethod} onSelect={setSelectedMethod} />

                <button
                  onClick={handlePay}
                  disabled={!selectedMethod}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3.5 text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {selectedMethod ? `Pay ₦${formatNumber(data.totalAmount)}` : "Select a payment method"}
                </button>
              </div>
            </div>
          </div>
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
