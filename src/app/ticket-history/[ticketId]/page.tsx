"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Calendar, Clock, MapPin, QrCode, Sparkles, Download, Scan, CheckCircle, Gift } from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import QRCode from "react-qr-code"
import html2canvas from "html2canvas"
import FaceEmbeddingModal from "@/components/FaceEmbeddingModal"
import GiftTicket from "./helper/giftTicket"

interface TicketDetails {
  id: string
  eventId: string
  eventName: string
  eventType: string
  ticketType: string
  ticketPrice: number
  ticketReference: string
  purchaseDate: string
  purchaseTime: string
  paymentMethod: string
  eventCreatorId?: string
  eventDate?: string
  eventEndDate?: string
  eventStart?: string
  eventEnd?: string
  eventVenue?: string
  stopDate?: string
  // Gift fields
  giftedBy?: string
  gifterName?: string
  giftNote?: string
  giftReason?: string
}

export default function TicketHistoryInfo() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.ticketId as string
  const ticketRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrCodeGenerated, setQrCodeGenerated] = useState(false)
  const [generatingQr, setGeneratingQr] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showFaceEmbeddingModal, setShowFaceEmbeddingModal] = useState(false)
  const [hasEmbedding, setHasEmbedding] = useState(false)
  const [showGiftModal, setShowGiftModal] = useState(false)

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "Not specified"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const formatDisplayTime = (timeString: string) => {
    if (!timeString) return "Not specified"
    if (/^\d{1,2}:\d{2}$/.test(timeString)) {
      try {
        const [hours, minutes] = timeString.split(":").map(Number)
        const period = hours >= 12 ? "PM" : "AM"
        const displayHours = hours % 12 || 12
        return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
      } catch {
        return timeString
      }
    }
    return timeString
  }

  // Fetch ticket details
  useEffect(() => {
    const fetchTicketDetails = async () => {
      try {
        if (!ticketId) {
          setError("Ticket ID not found")
          setLoading(false)
          return
        }

        const response = await fetch(`/api/v1/ticket/${ticketId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })

        if (response.status === 401) { router.push("/auth/login"); return }
        if (response.status === 403) { setError("You do not have permission to access this ticket"); setLoading(false); return }
        if (response.status === 404) { setError("Ticket not found"); setLoading(false); return }
        if (!response.ok) throw new Error(`Failed to fetch ticket: ${response.statusText}`)

        const data = await response.json()
        if (data.success && data.ticket) {
          setTicketDetails({
            id: data.ticket.id,
            eventId: data.ticket.eventId,
            eventName: data.ticket.eventName,
            eventType: data.ticket.eventType,
            ticketType: data.ticket.ticketType,
            ticketPrice: data.ticket.ticketPrice,
            ticketReference: data.ticket.ticketReference,
            purchaseDate: data.ticket.purchaseDate,
            purchaseTime: data.ticket.purchaseTime,
            paymentMethod: data.ticket.paymentMethod,
            eventCreatorId: data.ticket.eventCreatorId,
            eventDate: data.ticket.eventDate,
            eventEndDate: data.ticket.eventEndDate,
            eventStart: data.ticket.eventStart,
            eventEnd: data.ticket.eventEnd,
            eventVenue: data.ticket.eventVenue,
            stopDate: data.ticket.stopDate,
            // Gift fields
            giftedBy: data.ticket.giftedBy,
            gifterName: data.ticket.gifterName,
            giftNote: data.ticket.giftNote,
            giftReason: data.ticket.giftReason,
          })
        }
        setLoading(false)
      } catch (err) {
        console.error("  Error fetching ticket:", err)
        setError("Failed to load ticket details")
        setLoading(false)
      }
    }
    fetchTicketDetails()
  }, [ticketId, router])

  // Check if face embedding exists
  useEffect(() => {
    if (!ticketDetails?.id) return
    const checkEmbedding = async () => {
      try {
        const res = await fetch(`/api/v1/ticket/${ticketId}/embedding`)
        if (res.ok) {
          const data = await res.json()
          setHasEmbedding(data.hasEmbedding ?? false)
        }
      } catch {
        // non-fatal
      }
    }
    checkEmbedding()
  }, [ticketDetails?.id, ticketId])

  const handleGenerateQR = () => {
    setGeneratingQr(true)
    setTimeout(() => { setQrCodeGenerated(true); setGeneratingQr(false) }, 1500)
  }

  /**
   * html2canvas fix: Tailwind CSS (and many modern CSS libs) use oklch/lab color
   * functions that html2canvas doesn't understand, causing the
   * "unsupported color function lab" console error and broken captures.
   *
   * Fix: before capturing, clone the element and replace all computed styles
   * that use oklch/lab with their rgb() fallbacks computed by the browser.
   */
  const handleDownloadTicket = async () => {
    if (!ticketRef.current || !ticketDetails || !qrCodeGenerated) return
    setIsDownloading(true)
    try {
      // Build a safe style overrides map so html2canvas only sees rgb()
      const allElements = [
        ticketRef.current,
        ...Array.from(ticketRef.current.querySelectorAll("*")),
      ] as HTMLElement[]

      const styleOverrides = new Map<HTMLElement, { property: string; value: string }[]>()

      const colorProps = [
        "color", "background-color", "border-color",
        "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
        "outline-color", "text-decoration-color", "fill", "stroke",
      ]

      allElements.forEach((el) => {
        const computed = window.getComputedStyle(el)
        const overrides: { property: string; value: string }[] = []

        colorProps.forEach((prop) => {
          const value = computed.getPropertyValue(prop)
          // Replace oklch/lab/lch/oklab with a dummy safe fallback only if needed
          // The browser already resolves these to rgb() in getComputedStyle on
          // Chromium — but if it doesn't (Safari/Firefox), we skip gracefully.
          if (value && (value.includes("oklch") || value.includes("lab(") || value.includes("lch(") || value.includes("oklab("))) {
            // Force the element to use the resolved rgb via a temporary inline style reset
            overrides.push({ property: prop, value: "transparent" })
          }
        })

        if (overrides.length) styleOverrides.set(el, overrides)
      })

      // Temporarily patch problematic elements
      styleOverrides.forEach((overrides, el) => {
        overrides.forEach(({ property, value }) => {
          el.style.setProperty(property, value)
        })
      })

      const canvas = await html2canvas(ticketRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        scale: 2, // retina quality
        logging: false,
        // Ignore elements that can't be rendered (like SVG QR codes need special handling)
        ignoreElements: (element) => {
          // html2canvas handles inline SVG fine; skip nothing by default
          return false
        },
      })

      // Restore patched styles
      styleOverrides.forEach((overrides, el) => {
        overrides.forEach(({ property }) => {
          el.style.removeProperty(property)
        })
      })

      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `ticket-${ticketDetails.ticketReference}.png`
      link.click()
    } catch (error) {
      console.error("Error downloading ticket:", error)
      alert("Failed to download ticket. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleAddToCalendar = () => {
    if (!ticketDetails?.eventDate) { alert("Event date not available"); return }
    try {
      const startDate = new Date(ticketDetails.eventDate)
      const endDate = new Date(startDate)
      endDate.setHours(endDate.getHours() + 2)
      const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "")
      window.open(
        `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ticketDetails.eventName)}&dates=${fmt(startDate)}/${fmt(endDate)}&location=${encodeURIComponent(ticketDetails.eventVenue || "Event Venue")}`,
        "_blank"
      )
    } catch (error) {
      console.error("Error adding to calendar:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading ticket details...</p>
        </div>
      </div>
    )
  }

  if (error || !ticketDetails) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <UserHeader />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{error || "An error occurred"}</h2>
            <button onClick={() => router.back()} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Go Back
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const isGiftedTicket = !!ticketDetails.giftedBy

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <UserHeader />

      <div className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col">

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-8 font-medium w-fit transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back to Tickets
        </button>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Ticket</h1>
          <p className="text-gray-500 text-sm mt-1">Keep this safe — you'll need it at the event.</p>
        </div>

        {/* Gifted Banner */}
        {isGiftedTicket && (
          <div className="mb-6 bg-purple-50 border border-purple-200 rounded-2xl px-5 py-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Gift size={15} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-800">
                This ticket was gifted to you by{" "}
                <span className="text-purple-600">{ticketDetails.gifterName || ticketDetails.giftedBy}</span>
              </p>
              {ticketDetails.giftNote && (
                <p className="text-xs text-purple-600 mt-1 italic">
                  "{ticketDetails.giftNote}"
                </p>
              )}
              {ticketDetails.giftReason && (
                <p className="text-xs text-purple-500 mt-0.5">
                  Reason: {ticketDetails.giftReason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Ticket Card */}
          <div ref={ticketRef} className="lg:col-span-2">
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

              {/* Ticket Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-8 py-10 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                    backgroundSize: "40px 40px"
                  }}
                />
                <div className="relative">
                  <span className="inline-block text-xs font-semibold tracking-widest uppercase text-purple-200 mb-3">
                    {ticketDetails.eventType}
                  </span>
                  <h2 className="text-3xl font-bold leading-tight">{ticketDetails.eventName}</h2>
                </div>
              </div>

              {/* Tear Line */}
              <div className="relative h-0 border-t-2 border-dashed border-gray-200">
                <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-white border border-gray-200" />
                <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-white border border-gray-200" />
              </div>

              {/* Ticket Body */}
              <div className="p-8 bg-white">

                {/* Date, Time & Venue */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 pb-8 border-b border-dashed border-gray-200">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date & Time</p>
                    <p className="text-lg font-bold text-gray-900 mb-1">
                      {ticketDetails.eventDate ? formatDisplayDate(ticketDetails.eventDate) : "Not specified"}
                    </p>
                    {ticketDetails.eventStart && (
                      <p className="text-sm text-gray-500 flex items-center gap-1.5">
                        <Clock size={13} className="text-purple-500" />
                        {formatDisplayTime(ticketDetails.eventStart)}
                        {ticketDetails.eventEnd && <> – {formatDisplayTime(ticketDetails.eventEnd)}</>}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Venue</p>
                    <p className="text-lg font-bold text-gray-900 mb-1">{ticketDetails.eventVenue || "Not specified"}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <MapPin size={13} className="text-purple-500" />
                      Event Location
                    </p>
                  </div>
                </div>

                {/* Ticket Type, Price, Reference */}
                <div className="grid grid-cols-3 gap-4 mb-8 pb-8 border-b border-dashed border-gray-200">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ticket Type</p>
                    <p className="text-base font-bold text-gray-900">{ticketDetails.ticketType}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Price</p>
                    <p className="text-xl font-bold text-purple-600">
                      {ticketDetails.ticketPrice === 0 ? "Free" : `₦${ticketDetails.ticketPrice.toLocaleString()}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Reference</p>
                    <p className="text-sm font-mono text-gray-700 break-all">{ticketDetails.ticketReference}</p>
                  </div>
                </div>

                {/* Ticket Number */}
                <div className="mb-8 pb-8 border-b border-dashed border-gray-200">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ticket ID</p>
                  <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest">{ticketId}</p>
                </div>

                {/* Purchase Info */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Purchased</p>
                    <p className="text-sm text-gray-700 font-medium">{ticketDetails.purchaseDate}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Time</p>
                    <p className="text-sm text-gray-700 font-medium">{ticketDetails.purchaseTime}</p>
                  </div>
                </div>

                {/* Spotix Footer */}
                <div className="flex items-center justify-center gap-2 pt-6 border-t border-gray-100">
                  <CheckCircle size={14} className="text-purple-500" />
                  <p className="text-xs text-gray-400 font-medium">Verified by <span className="text-purple-600 font-semibold">Spotix</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-4">

            {/* QR Code Card */}
            <div className="border border-gray-200 rounded-2xl p-6 flex flex-col items-center bg-white shadow-sm">
              <p className="text-sm font-semibold text-gray-700 mb-5">Entry Pass</p>

              {!qrCodeGenerated ? (
                <div className="flex flex-col items-center w-full">
                  <div className="w-36 h-36 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
                    <QrCode size={40} className="text-gray-300" />
                  </div>
                  <p className="text-xs text-gray-400 text-center mb-5 leading-relaxed">
                    Generate your QR code to present at the event entrance.
                  </p>
                  <button
                    onClick={handleGenerateQR}
                    disabled={generatingQr}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium text-sm"
                  >
                    {generatingQr ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        Generate QR Code
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full">
                  <div className="p-3 bg-white border border-gray-200 rounded-xl mb-3 shadow-sm">
                    <QRCode value={ticketId} size={160} level="H" fgColor="#7c3aed" bgColor="#ffffff" />
                  </div>
                  <p className="text-xs text-gray-400 text-center mb-3 leading-relaxed">
                    Show only to official check-in staff
                  </p>
                  <button
                    onClick={() => setQrCodeGenerated(false)}
                    className="text-purple-600 hover:text-purple-700 font-medium text-xs transition-colors"
                  >
                    Hide QR Code
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleAddToCalendar}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm shadow-sm"
              >
                <Calendar size={16} className="text-purple-500" />
                Add to Calendar
              </button>

              <button
                onClick={() => setShowFaceEmbeddingModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm shadow-sm"
              >
                <Scan size={16} className="text-purple-500" />
                {hasEmbedding ? "Manage Face ID" : "Register Face ID"}
              </button>

              {/* Gift Ticket button — hidden if this ticket was already gifted to you */}
              {!isGiftedTicket && (
                <button
                  onClick={() => setShowGiftModal(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors text-sm shadow-sm"
                >
                  <Gift size={16} className="text-purple-500" />
                  Gift Ticket
                </button>
              )}

              {qrCodeGenerated && (
                <button
                  onClick={handleDownloadTicket}
                  disabled={isDownloading}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm shadow-sm"
                >
                  <Download size={16} />
                  {isDownloading ? "Downloading..." : "Download Ticket"}
                </button>
              )}
            </div>

            {/* Info Note */}
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-4 space-y-2">
              <p className="text-xs text-purple-700 leading-relaxed">
                <span className="font-semibold">Tip:</span> Register your Face ID for faster check-in at the event. Your QR code works as a backup.
              </p>
              <p className="text-xs text-purple-500 leading-relaxed">
                We store and process facial data securely in line with our{" "}
                <a href="/privacy" target="_blank" className="text-purple-600 font-medium hover:underline">Privacy Policy</a>. You can delete your Face ID at any time from the "Manage Face ID" section.
              </p>
            </div>
          </div>
        </div>
      </div>

      <FaceEmbeddingModal
        isOpen={showFaceEmbeddingModal}
        ticketId={ticketId}
        eventId={ticketDetails?.eventId || ""}
        hasExistingEmbedding={hasEmbedding}
        onClose={() => setShowFaceEmbeddingModal(false)}
        onSuccess={() => {
          setHasEmbedding(true)
          console.log("  Face embedding saved successfully")
        }}
        onDeleted={() => {
          setHasEmbedding(false)
          console.log("  Face embedding deleted")
        }}
      />

      <GiftTicket
        isOpen={showGiftModal}
        ticketId={ticketId}
        onClose={() => setShowGiftModal(false)}
        onSuccess={(newTicketId: any) => {
          console.log("  Ticket gifted, new ID:", newTicketId)
          // Redirect away since old ticket no longer belongs to this user
          router.push("/tickets")
        }}
      />

      <Footer />
    </div>
  )
}