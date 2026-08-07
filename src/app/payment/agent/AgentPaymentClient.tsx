"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, AlertCircle, Loader2, Ticket, CalendarDays, MapPin, UserCheck } from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import PayWithPaystack from "@/components/PayWithPaystack"

interface AgentReference {
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
  ticketType: string
  totalTicketCount: number
  ticketPrice: number
  transactionFee: number
  totalAmount: number
  buyerFullName: string
  buyerEmail: string
  buyerPhone: string
  agentName: string
  isFree: boolean
}

export default function AgentPaymentClient({ refId }: { refId: string | null }) {
  const router = useRouter()
  const [data, setData] = useState<AgentReference | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPaystack, setShowPaystack] = useState(false)

  useEffect(() => {
    if (!refId) {
      setError("This payment link is missing a reference. Please ask your agent for a new link.")
      setLoading(false)
      return
    }

    fetch(`/api/v1/agent-ref/${refId}`)
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
    setShowPaystack(false)
  }

  const [confirming, setConfirming] = useState(false)
  const handleConfirmFree = async () => {
    if (!data) return
    setConfirming(true)
    try {
      const res = await fetch(`/api/v1/agent-ref/${data.reference}/confirm-free`, { method: "POST" })
      const result = await res.json()
      if (!result.success) {
        setError(result.error || "Unable to confirm this ticket")
        setConfirming(false)
        return
      }
      router.push(`/payment/success?reference=${data.reference}`)
    } catch {
      setError("Something went wrong. Please try again")
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
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
      <div className="min-h-screen flex flex-col">
        <UserHeader />
        <main className="flex-1 flex items-center justify-center px-4">
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <UserHeader />
      <main className="flex-1 px-4 py-10">
        <div className="max-w-lg mx-auto space-y-6">
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

          {/* Agent notice */}
          <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
            <UserCheck className="w-5 h-5 text-purple-600 shrink-0" />
            <p className="text-sm text-purple-800">
              <span className="font-semibold">{data.agentName}</span> prepared this transaction for you.
            </p>
          </div>

          {/* Confirmation details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-purple-600" /> Order details
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Ticket type</span>
                <span className="font-medium text-gray-900">{data.ticketType}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Quantity</span>
                <span className="font-medium text-gray-900">{data.totalTicketCount}</span>
              </div>
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
              <div className="flex justify-between text-gray-600">
                <span>Phone</span>
                <span className="font-medium text-gray-900">{data.buyerPhone}</span>
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
                  <span>Total</span>
                  <span>₦{Number(data.totalAmount).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => (data.isFree ? handleConfirmFree() : setShowPaystack(true))}
            disabled={confirming}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3.5 text-sm transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <CheckCircle className="w-4 h-4" /> {data.isFree ? (confirming ? "Confirming..." : "Confirm & Get Ticket") : "Pay Now"}
          </button>
        </div>
      </main>
      <Footer />

      {showPaystack && (
        <PayWithPaystack
          email={data.buyerEmail}
          amount={data.totalAmount}
          isGuest={true}
          userId={null}
          fullName={data.buyerFullName}
          phone={data.buyerPhone}
          metadata={{
            eventId: data.eventId,
            eventName: data.eventName,
            ticketType: data.ticketType,
            ticketPrice: data.totalAmount,
            eventCreatorId: data.eventCreatorId,
            userId: null,
          }}
          onSuccess={handlePaystackSuccess}
          onClose={handlePaystackClose}
        />
      )}
    </div>
  )
}
