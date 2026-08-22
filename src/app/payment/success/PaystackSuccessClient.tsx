"use client"

import { Suspense } from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"

// Sub-components
import LoadingState from "./components/LoadingState"
import ErrorState from "./components/ErrorState"
import IncorrectAmountState from "./components/IncorrectAmountState"
import Confetti from "./components/Confetti"
import TicketQRCard from "./components/TicketQRCard"
import SaveTicketsBanner from "./components/SaveTicketsBanner"
import SuccessHeader from "./components/SuccessHeader"
import TicketDetailsCard from "./components/TicketDetailsCard"
import ActionButtons from "./components/ActionButtons"
import WhatsNextCard from "./components/WhatsNextCard"
import BackToHomeLink from "./components/BackToHomeLink"
import { isIncorrectAmountMessage } from "@/utils/paymentMessages"

// PDF helpers
import { rasteriseQRFromWrapper, buildAllTicketsPDF } from "@/lib/ticket"

interface TicketData {
  success: boolean
  message: string
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

function PaymentSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading]               = useState(true)
  const [ticketData, setTicketData]         = useState<TicketData | null>(null)
  const [error, setError]                   = useState<string | null>(null)
  const [incorrectAmount, setIncorrectAmount] = useState(false)
  const [showConfetti, setShowConfetti]     = useState(false)
  const [downloading, setDownloading]       = useState(false)
  const [downloaded, setDownloaded]         = useState(false)

  // One ref per ticket ID
  const qrRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // ── Fetch / generate ticket on mount ──────────────────────────────────────
  useEffect(() => {
    const generateTicket = async () => {
      try {
        const reference = searchParams.get("reference")

        if (!reference) {
          setError("No payment reference found. Please check your email or contact support.")
          setLoading(false)
          return
        }

        const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL
        if (!BACKEND_URL) {
          setError("Configuration error. Please contact support.")
          setLoading(false)
          return
        }

        // Retry loop — if the backend returns 409 it means another request is
        // mid-flight for the same reference (race on double-POST). Poll with
        // backoff until the winner finishes and the reference is marked complete.
        const MAX_ATTEMPTS = 6
        const RETRY_DELAY_MS = 2500
        let lastError = ""

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          const response = await fetch(`${BACKEND_URL}/v1/ticket`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference }),
          })

          const data = await response.json()

          if (response.status === 409) {
            // Another request is processing — wait and retry
            if (attempt < MAX_ATTEMPTS) {
              await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
              continue
            }
            // Max retries hit — fall through to error
            lastError = "Ticket generation is taking longer than expected. Please refresh the page."
            break
          }

          if (!response.ok) {
            // Buyer transferred the wrong amount — the backend's Paystack
            // check surfaces this as a specific gateway message rather
            // than a generic failure. Show the reversal notice instead.
            if (isIncorrectAmountMessage(data.message)) {
              setIncorrectAmount(true)
              setLoading(false)
              return
            }
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
            setLoading(false)
            return
          }

          if (isIncorrectAmountMessage(data.message)) {
            setIncorrectAmount(true)
            setLoading(false)
            return
          }

          setError(data.message || "Ticket generation failed")
          setLoading(false)
          return
        }

        setError(lastError || "Ticket generation failed. Please refresh or contact support.")
        setLoading(false)
      } catch (err) {
        console.error("Ticket generation error:", err)
        setError("An unexpected error occurred. Please contact support.")
        setLoading(false)
      }
    }

    generateTicket()
  }, [searchParams])

  // ── Single-PDF download (all tickets, named by reference) ─────────────────
  const handleDownloadPDF = useCallback(async (data: TicketData) => {
    setDownloading(true)
    try {
      // Let QR SVGs fully paint before we rasterise
      await new Promise((r) => setTimeout(r, 800))

      const ticketsWithQR = await Promise.all(
        data.ticketIds.map(async (ticketId, idx) => {
          const wrapperEl = qrRefs.current[ticketId]
          const qrPngDataUrl = await rasteriseQRFromWrapper(wrapperEl)
          return {
            ticketId,
            ticketType: `Ticket ${idx + 1}`,
            ticketPrice: data.totalAmount / data.totalTickets,
            qrPngDataUrl,
          }
        })
      )

      buildAllTicketsPDF({
        tickets: ticketsWithQR,
        eventName: data.eventName,
        eventType: data.eventDetails.eventType || "EVENT",
        ticketReference: data.ticketReference,
        purchaseDate: new Date().toLocaleDateString("en-NG"),
        purchaseTime: new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
        totalAmount: data.totalAmount,
        eventDate: data.eventDetails.eventDate,
        eventStart: data.eventDetails.eventStart,
        eventEnd: data.eventDetails.eventEnd,
        eventVenue: data.eventDetails.eventVenue,
        buyerName: data.buyerInfo.fullName,
        buyerEmail: data.buyerInfo.email,
      })

      setDownloaded(true)
    } catch (err) {
      console.error("PDF download failed:", err)
    } finally {
      setDownloading(false)
    }
  }, [])

  const handleGoHome      = () => router.push("/home")
  const handleViewTicket  = () => {
    if (ticketData?.ticketIds?.length) router.push(`/ticket?id=${ticketData.ticketIds[0]}`)
  }
  const handleViewTickets = () => router.push("/ticket-history")

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) return <LoadingState />

  if (incorrectAmount) {
    return (
      <IncorrectAmountState
        reference={searchParams.get("reference")}
        onGoHome={handleGoHome}
      />
    )
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        reference={searchParams.get("reference")}
        onRetry={() => window.location.reload()}
        onGoHome={handleGoHome}
      />
    )
  }

  if (!ticketData) return null

  // Defensive fallback: buyerInfo should always exist but guard against
  // a partial response (e.g. backend alreadyGenerated path missing the field)
  const buyerInfo = ticketData.buyerInfo ?? { fullName: "", email: "", isGuest: false }

  const isFreeTicket  = ticketData.totalAmount === 0
  const isMultiTicket = ticketData.totalTickets > 1

  return (
    <>
      {showConfetti && <Confetti />}

      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">

          <SuccessHeader
            isFreeTicket={isFreeTicket}
            isMultiTicket={isMultiTicket}
            totalTickets={ticketData.totalTickets}
          />

          {/* ── Screenshot / download nudge + PDF button ───────────────── */}
          <SaveTicketsBanner
            isMultiTicket={isMultiTicket}
            isGuest={buyerInfo.isGuest}
            email={buyerInfo.email}
            onDownload={() => handleDownloadPDF(ticketData)}
            downloading={downloading}
            downloaded={downloaded}
          />

          {/* ── QR Codes ───────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Your QR Code{isMultiTicket ? "s" : ""}</h2>
            <p className="text-sm text-gray-500 mb-5">
              Present {isMultiTicket ? "each QR code" : "this QR code"} at the event entrance for check-in.
            </p>

            <div className={`grid gap-4 ${isMultiTicket ? "sm:grid-cols-2" : "place-items-center"}`}>
              {ticketData.ticketIds.map((ticketId, idx) => (
                <TicketQRCard
                  key={ticketId}
                  ticketId={ticketId}
                  index={idx}
                  total={ticketData.totalTickets}
                  qrRef={(el) => { qrRefs.current[ticketId] = el }}
                />
              ))}
            </div>
          </div>

          <TicketDetailsCard
            eventName={ticketData.eventName}
            ticketIds={ticketData.ticketIds}
            totalTickets={ticketData.totalTickets}
            totalAmount={ticketData.totalAmount}
            ticketReference={ticketData.ticketReference}
            isFreeTicket={isFreeTicket}
            isMultiTicket={isMultiTicket}
            discountApplied={ticketData.discountApplied}
            referralUsed={ticketData.referralUsed}
            buyerInfo={buyerInfo}
            eventDetails={ticketData.eventDetails}
          />

          <ActionButtons
            isMultiTicket={isMultiTicket}
            onViewTicket={handleViewTicket}
            onViewTickets={handleViewTickets}
          />

          <WhatsNextCard
            buyerEmail={buyerInfo.email}
            bookerEmail={ticketData.eventDetails.bookerEmail}
            isMultiTicket={isMultiTicket}
          />

          <BackToHomeLink onGoHome={handleGoHome} />

        </div>
      </div>

      <style jsx>{`
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
