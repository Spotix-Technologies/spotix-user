"use client"

import { Suspense } from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Loader2, ArrowRight, Ticket, Download } from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"

interface TicketData {
  success: boolean
  message: string
  // Multi-ticket fields (new shape)
  ticketIds: string[]
  totalTickets: number
  ticketReference: string
  eventId: string
  eventName: string
  totalAmount: number
  buyerInfo: {
    fullName: string
    email: string
    isGuest: boolean
  }
  eventDetails: {
    eventVenue: string
    eventType: string
    eventDate: string
    eventEndDate: string
    eventStart: string
    eventEnd: string
    bookerName: string
    bookerEmail: string
  }
  discountApplied: boolean
  referralUsed: boolean
}

// Separate component that uses useSearchParams
function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    const generateTicket = async () => {
      try {
        const reference = searchParams.get("reference")

        if (!reference) {
          setError("No payment reference found. Please check your email or contact support.")
          setLoading(false)
          return
        }

        console.log("Generating ticket for reference:", reference)

        // Get stored payment data to determine if ticket is free
        const storedPaymentData =
          sessionStorage.getItem("spotix_payment_data") ||
          sessionStorage.getItem("paystack_payment_data")

        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

        if (!BACKEND_URL) {
          setError("Configuration error. Please contact support.")
          setLoading(false)
          return
        }

        // Always use the unified ticket endpoint for both free and paid events
        const ticketEndpoint = `${BACKEND_URL}/v1/ticket`

        console.log("Calling ticket endpoint:", ticketEndpoint)

        const response = await fetch(ticketEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.message || "Failed to generate ticket. Please try again.")
          setLoading(false)
          return
        }

        if (data.success) {
          setTicketData(data)
          setShowConfetti(true)
          setTimeout(() => setShowConfetti(false), 5000)

          sessionStorage.removeItem("paystack_payment_data")
          sessionStorage.removeItem("spotix_payment_data")
          sessionStorage.removeItem("selected_referral_code")
        } else {
          setError(data.message || "Ticket generation failed")
        }

        setLoading(false)
      } catch (error) {
        console.error("Ticket generation error:", error)
        setError("An unexpected error occurred. Please contact support.")
        setLoading(false)
      }
    }

    generateTicket()
  }, [searchParams])

  // For multi-ticket purchases, "View Ticket" links to the first ticket
  const handleViewTicket = () => {
    if (ticketData?.ticketIds?.length) {
      router.push(`/ticket?id=${ticketData.ticketIds[0]}`)
    }
  }

  const handleGoHome = () => router.push("/home")
  const handleViewTickets = () => router.push("/ticket-history")

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Registration</h2>
          <p className="text-gray-600">Please wait while we generate your ticket...</p>
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
              <span>Verifying registration</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse delay-100"></div>
              <span>Generating ticket</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse delay-200"></div>
              <span>Sending confirmation</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">Registration Issue</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-6 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={handleGoHome}
              className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </button>
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">
            If you need assistance, please contact support with reference:{" "}
            {searchParams.get("reference")}
          </p>
        </div>
      </div>
    )
  }

  if (!ticketData) return null

  const isFreeTicket = ticketData.totalAmount === 0
  const isMultiTicket = ticketData.totalTickets > 1

  return (
    <>
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: ["#6b2fa5", "#8b5cf6", "#a78bfa", "#c4b5fd", "#fbbf24", "#34d399"][
                    Math.floor(Math.random() * 6)
                  ],
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Success Header */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {isFreeTicket ? "Registration Successful!" : "Payment Successful!"}
            </h1>
            <p className="text-lg text-gray-600">
              {isMultiTicket
                ? `${ticketData.totalTickets} tickets have been generated`
                : "Your ticket has been generated"}
            </p>
          </div>

          {/* Ticket Details Card */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-200 text-sm mb-1">Event</p>
                  <h2 className="text-2xl font-bold">{ticketData.eventName}</h2>
                </div>
                <Ticket className="w-12 h-12 opacity-50" />
              </div>
            </div>

            {/* Ticket Body */}
            <div className="p-6 space-y-6">

              {/* Ticket ID(s) */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
                <p className="text-sm text-purple-700 font-medium mb-2">
                  {isMultiTicket ? `Ticket IDs (${ticketData.totalTickets})` : "Ticket ID"}
                </p>
                {isMultiTicket ? (
                  <div className="space-y-1">
                    {ticketData.ticketIds.map((id, idx) => (
                      <p key={id} className="text-sm font-bold text-purple-900 font-mono">
                        {idx + 1}. {id}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-purple-900 font-mono">
                    {ticketData.ticketIds[0]}
                  </p>
                )}
              </div>

              {/* Event Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tickets Purchased</p>
                  <p className="text-lg font-bold text-gray-900">{ticketData.totalTickets}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
                  <p className="text-lg font-bold text-gray-900">
                    {isFreeTicket ? "FREE" : `₦${ticketData.totalAmount.toLocaleString()}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {ticketData.eventDetails.eventDate
                      ? new Date(ticketData.eventDetails.eventDate).toLocaleDateString()
                      : "TBA"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Time</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {ticketData.eventDetails.eventStart} - {ticketData.eventDetails.eventEnd}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 mb-1">Venue</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {ticketData.eventDetails.eventVenue}
                  </p>
                </div>
              </div>

              {/* Attendee Info — uses buyerInfo from new response shape */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Attendee Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Name</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {ticketData.buyerInfo.fullName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {ticketData.buyerInfo.email}
                    </p>
                  </div>
                  {ticketData.buyerInfo.isGuest && (
                    <div className="md:col-span-2">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">
                        👤 Guest Purchase
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Badges */}
              {(ticketData.discountApplied || ticketData.referralUsed || isFreeTicket) && (
                <div className="flex flex-wrap gap-2">
                  {isFreeTicket && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                      🎁 Free Event
                    </span>
                  )}
                  {ticketData.discountApplied && !isFreeTicket && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full">
                      🎉 Discount Applied
                    </span>
                  )}
                  {ticketData.referralUsed && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                      👥 Referral Used
                    </span>
                  )}
                </div>
              )}

              {/* Reference Number */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">
                  {isFreeTicket ? "Registration Reference" : "Payment Reference"}
                </p>
                <p className="text-sm font-mono text-gray-900 break-all">
                  {ticketData.ticketReference}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={handleViewTicket}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold rounded-xl hover:from-purple-700 hover:to-purple-900 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <Ticket size={20} />
              {isMultiTicket ? "View First Ticket" : "View Ticket Details"}
              <ArrowRight size={20} />
            </button>
            <button
              onClick={handleViewTickets}
              className="w-full py-4 px-6 bg-white border-2 border-purple-600 text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
            >
              <Download size={20} />
              View All Tickets
            </button>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">What's Next?</h3>
                <ul className="space-y-2 text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">✓</span>
                    <span>
                      A confirmation email has been sent to {ticketData.buyerInfo.email}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">✓</span>
                    <span>Your ticket{isMultiTicket ? "s are" : " is"} now available in your ticket history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">✓</span>
                    <span>Present your ticket ID at the event entrance for verification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">✓</span>
                    <span>
                      For questions, contact: {ticketData.eventDetails.bookerEmail}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Home Button */}
          <div className="text-center mt-8">
            <button
              onClick={handleGoHome}
              className="text-purple-600 hover:text-purple-800 font-semibold transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
          }
        }

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: confetti-fall 3s linear infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .animate-bounce {
          animation: bounce 1s ease-in-out infinite;
        }
      `}</style>
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading...</h2>
        <p className="text-gray-600">Please wait</p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <>
      <UserHeader />
      <Suspense fallback={<LoadingFallback />}>
        <PaymentSuccessContent />
      </Suspense>
      <Footer />
    </>
  )
}