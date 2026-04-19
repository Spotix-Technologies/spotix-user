"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Calendar, Clock, MapPin, QrCode, Sparkles, Download, Scan, CheckCircle, Gift } from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import QRCode from "react-qr-code"
import jsPDF from "jspdf"
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
  // Direct ref to the QR wrapper div — more reliable than querySelector
  const qrWrapperRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const fetchTicketDetails = async () => {
      try {
        if (!ticketId) { setError("Ticket ID not found"); setLoading(false); return }

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
            giftedBy: data.ticket.giftedBy,
            gifterName: data.ticket.gifterName,
            giftNote: data.ticket.giftNote,
            giftReason: data.ticket.giftReason,
          })
        }
        setLoading(false)
      } catch (err) {
        console.error("Error fetching ticket:", err)
        setError("Failed to load ticket details")
        setLoading(false)
      }
    }
    fetchTicketDetails()
  }, [ticketId, router])

  useEffect(() => {
    if (!ticketDetails?.id) return
    const checkEmbedding = async () => {
      try {
        const res = await fetch(`/api/v1/ticket/${ticketId}/embedding`)
        if (res.ok) {
          const data = await res.json()
          setHasEmbedding(data.hasEmbedding ?? false)
        }
      } catch { /* non-fatal */ }
    }
    checkEmbedding()
  }, [ticketDetails?.id, ticketId])

  const handleGenerateQR = () => {
    setGeneratingQr(true)
    setTimeout(() => { setQrCodeGenerated(true); setGeneratingQr(false) }, 1500)
  }

  /**
   * Rasterise the react-qr-code SVG to a PNG data URL.
   *
   * Strategy:
   *  1. Use qrWrapperRef to find the SVG directly — no querySelector guessing.
   *  2. Clone the SVG and force explicit width/height attributes so the browser
   *     can calculate intrinsic dimensions when loading as an Image.
   *     Without this, drawImage() produces a blank result in Firefox/Safari.
   *  3. Render onto a white-background canvas then export as PNG.
   */
  const rasteriseQR = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const svgEl = qrWrapperRef.current?.querySelector("svg")
      if (!svgEl) { resolve(null); return }

      const SIZE = 300 // internal canvas resolution — higher = crisper in PDF

      // Clone so we can mutate without touching the live DOM
      const clone = svgEl.cloneNode(true) as SVGElement
      clone.setAttribute("width", String(SIZE))
      clone.setAttribute("height", String(SIZE))
      // Ensure white background inside the SVG itself
      clone.style.background = "#ffffff"

      const svgData = new XMLSerializer().serializeToString(clone)
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      const svgUrl  = URL.createObjectURL(svgBlob)

      const img = new Image()
      img.width  = SIZE
      img.height = SIZE

      img.onload = () => {
        const cvs = document.createElement("canvas")
        cvs.width  = SIZE
        cvs.height = SIZE
        const ctx  = cvs.getContext("2d")!
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, SIZE, SIZE)
        ctx.drawImage(img, 0, 0, SIZE, SIZE)
        URL.revokeObjectURL(svgUrl)
        resolve(cvs.toDataURL("image/png"))
      }

      img.onerror = () => {
        URL.revokeObjectURL(svgUrl)
        resolve(null)
      }

      img.src = svgUrl
    })
  }

  const handleDownloadTicket = async () => {
    if (!ticketDetails || !qrCodeGenerated) return
    setIsDownloading(true)

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" })
      const pageW    = doc.internal.pageSize.getWidth()
      const margin   = 40
      const contentW = pageW - margin * 2
      let y = 0

      // ── Header Band ──────────────────────────────────────────────
      doc.setFillColor(107, 47, 165)
      doc.rect(0, 0, pageW, 110, "F")

      doc.setFillColor(130, 80, 190)
      for (let cx = 20; cx < pageW; cx += 40) {
        for (let cy = 5; cy < 110; cy += 40) {
          doc.circle(cx, cy, 1.5, "F")
        }
      }

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(200, 170, 230)
      doc.text((ticketDetails.eventType || "EVENT").toUpperCase(), margin, 36)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      const eventNameLines = doc.splitTextToSize(ticketDetails.eventName, contentW - 80)
      doc.text(eventNameLines, margin, 62)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(220, 190, 255)
      doc.text("SPOTIX", pageW - margin, 36, { align: "right" })

      y = 130

      // ── Tear-line ─────────────────────────────────────────────────
      doc.setDrawColor(220, 220, 220)
      doc.setLineDashPattern([4, 4], 0)
      doc.line(margin, y, pageW - margin, y)
      doc.setLineDashPattern([], 0)
      doc.setFillColor(245, 245, 245)
      doc.circle(margin - 10, y, 8, "F")
      doc.circle(pageW - margin + 10, y, 8, "F")

      y += 28

      // ── Helpers ───────────────────────────────────────────────────
      const label = (text: string, lx: number, ly: number) => {
        doc.setFont("helvetica", "bold")
        doc.setFontSize(7)
        doc.setTextColor(160, 160, 160)
        doc.text(text.toUpperCase(), lx, ly)
      }

      const value = (
        text: string,
        vx: number,
        vy: number,
        opts?: { color?: [number, number, number]; size?: number; mono?: boolean }
      ) => {
        doc.setFont(opts?.mono ? "courier" : "helvetica", "bold")
        doc.setFontSize(opts?.size ?? 11)
        doc.setTextColor(...(opts?.color ?? ([30, 30, 30] as [number, number, number])))
        doc.text(text, vx, vy)
      }

      const divider = (dy: number) => {
        doc.setDrawColor(230, 230, 230)
        doc.setLineDashPattern([3, 3], 0)
        doc.line(margin, dy, pageW - margin, dy)
        doc.setLineDashPattern([], 0)
      }

      // ── Row 1: Date & Time | Venue ────────────────────────────────
      const col1 = margin
      const col2 = margin + contentW / 2 + 10

      label("Date & Time", col1, y)
      label("Venue", col2, y)
      y += 16

      const dateStr = ticketDetails.eventDate ? formatDisplayDate(ticketDetails.eventDate) : "Not specified"
      value(dateStr, col1, y, { size: 10 })

      const venueStr   = ticketDetails.eventVenue || "Not specified"
      const venueLines = doc.splitTextToSize(venueStr, contentW / 2 - 10)
      value(venueLines[0], col2, y, { size: 10 })
      y += 16

      if (ticketDetails.eventStart) {
        const timeStr = `${formatDisplayTime(ticketDetails.eventStart)}${
          ticketDetails.eventEnd ? " – " + formatDisplayTime(ticketDetails.eventEnd) : ""
        }`
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(107, 47, 165)
        doc.text(timeStr, col1, y)
      }
      if (venueLines[1]) value(venueLines[1], col2, y, { size: 10 })

      y += 30
      divider(y)
      y += 20

      // ── Row 2: Ticket Type | Price | Reference ────────────────────
      const thirdW = contentW / 3
      const col3   = margin + thirdW
      const col4   = margin + thirdW * 2

      label("Ticket Type", col1, y)
      label("Price",       col3, y)
      label("Reference",   col4, y)
      y += 16

      value(ticketDetails.ticketType, col1, y)
      value(
        ticketDetails.ticketPrice === 0 ? "Free" : `N${ticketDetails.ticketPrice.toLocaleString()}`,
        col3,
        y,
        { color: [107, 47, 165], size: 13 }
      )
      value(ticketDetails.ticketReference, col4, y, { mono: true, size: 9 })

      y += 30
      divider(y)
      y += 20

      // ── Row 3: Ticket ID ──────────────────────────────────────────
      label("Ticket ID", col1, y)
      y += 16
      doc.setFont("courier", "bold")
      doc.setFontSize(16)
      doc.setTextColor(20, 20, 20)
      doc.setCharSpace(2)
      doc.text(ticketId, col1, y)
      doc.setCharSpace(0)

      y += 30
      divider(y)
      y += 20

      // ── Row 4: Purchased | Time ───────────────────────────────────
      label("Purchased", col1, y)
      label("Time",      col2, y)
      y += 16
      value(ticketDetails.purchaseDate, col1, y, { size: 10 })
      value(ticketDetails.purchaseTime, col2, y, { size: 10 })
      y += 34

      // ── Gift Banner ───────────────────────────────────────────────
      if (ticketDetails.giftedBy) {
        const bannerH = ticketDetails.giftNote ? 56 : 36
        doc.setFillColor(245, 237, 255)
        doc.setDrawColor(200, 170, 230)
        doc.roundedRect(margin, y, contentW, bannerH, 6, 6, "FD")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.setTextColor(107, 47, 165)
        doc.text(
          `Gifted to you by ${ticketDetails.gifterName || ticketDetails.giftedBy}`,
          margin + 12,
          y + 16
        )
        if (ticketDetails.giftNote) {
          doc.setFont("helvetica", "italic")
          doc.setFontSize(8)
          doc.setTextColor(130, 80, 180)
          doc.text(`"${ticketDetails.giftNote}"`, margin + 12, y + 32)
        }
        y += bannerH + 16
      }

      // ── QR Code ───────────────────────────────────────────────────
      const qrSize = 130
      const qrX    = pageW / 2 - qrSize / 2

      const pngData = await rasteriseQR()

      if (pngData) {
        // White card behind the QR
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(220, 220, 220)
        doc.roundedRect(qrX - 8, y - 8, qrSize + 16, qrSize + 16, 6, 6, "FD")
        doc.addImage(pngData, "PNG", qrX, y, qrSize, qrSize)
      } else {
        // Should never reach here if Download button is only shown after QR is generated,
        // but keep a graceful fallback just in case
        doc.setFillColor(245, 245, 245)
        doc.setDrawColor(200, 200, 200)
        doc.roundedRect(qrX, y, qrSize, qrSize, 4, 4, "FD")
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text("QR Code unavailable", pageW / 2, y + qrSize / 2 + 3, { align: "center" })
      }

      y += qrSize + 18

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text("Show only to official check-in staff", pageW / 2, y, { align: "center" })

      y += 28

      // ── Footer ────────────────────────────────────────────────────
      divider(y)
      y += 16

      const footerText  = "Verified by"
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(180, 180, 180)
      const verifiedWidth = doc.getTextWidth(footerText)

      const spotixText  = " SPOTIX"
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(107, 47, 165)
      const spotixWidth = doc.getTextWidth(spotixText)

      const totalWidth = verifiedWidth + spotixWidth
      const startX     = pageW / 2 - totalWidth / 2

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(180, 180, 180)
      doc.text(footerText, startX, y)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(107, 47, 165)
      doc.text(spotixText, startX + verifiedWidth, y)

      doc.save(`ticket-${ticketDetails.ticketReference}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleAddToCalendar = () => {
    if (!ticketDetails?.eventDate) { alert("Event date not available"); return }
    try {
      const startDate = new Date(ticketDetails.eventDate)
      const endDate   = new Date(startDate)
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
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

        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-8 font-medium w-fit transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back to Tickets
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Ticket</h1>
          <p className="text-gray-500 text-sm mt-1">Keep this safe — you'll need it at the event.</p>
        </div>

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
                <p className="text-xs text-purple-600 mt-1 italic">"{ticketDetails.giftNote}"</p>
              )}
              {ticketDetails.giftReason && (
                <p className="text-xs text-purple-500 mt-0.5">Reason: {ticketDetails.giftReason}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Ticket Card */}
          <div ref={ticketRef} className="lg:col-span-2">
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

              <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-8 py-10 text-white relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
                <div className="relative">
                  <span className="inline-block text-xs font-semibold tracking-widest uppercase text-purple-200 mb-3">
                    {ticketDetails.eventType}
                  </span>
                  <h2 className="text-3xl font-bold leading-tight">{ticketDetails.eventName}</h2>
                </div>
              </div>

              <div className="relative h-0 border-t-2 border-dashed border-gray-200">
                <div className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-white border border-gray-200" />
                <div className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-white border border-gray-200" />
              </div>

              <div className="p-8 bg-white">

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

                <div className="mb-8 pb-8 border-b border-dashed border-gray-200">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ticket ID</p>
                  <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest">{ticketId}</p>
                </div>

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

                <div className="flex items-center justify-center gap-2 pt-6 border-t border-gray-100">
                  <CheckCircle size={14} className="text-purple-500" />
                  <p className="text-xs text-gray-400 font-medium">
                    Verified by <span className="text-purple-600 font-semibold">Spotix</span>
                  </p>
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
                  {/*
                    qr-code-wrapper — ref attached here so handleDownloadTicket can
                    locate the SVG reliably without a DOM querySelector.
                  */}
                  <div
                    ref={qrWrapperRef}
                    className="qr-code-wrapper p-3 bg-white border border-gray-200 rounded-xl mb-3 shadow-sm"
                  >
                    <QRCode
                      value={ticketId}
                      size={160}
                      level="H"
                      fgColor="#7c3aed"
                      bgColor="#ffffff"
                    />
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
                <a href="/privacy" target="_blank" className="text-purple-600 font-medium hover:underline">Privacy Policy</a>.
                You can delete your Face ID at any time from the "Manage Face ID" section.
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
        onSuccess={() => { setHasEmbedding(true) }}
        onDeleted={() => { setHasEmbedding(false) }}
      />

      <GiftTicket
        isOpen={showGiftModal}
        ticketId={ticketId}
        onClose={() => setShowGiftModal(false)}
        onSuccess={(newTicketId: any) => {
          console.log("Ticket gifted, new ID:", newTicketId)
          router.push("/tickets")
        }}
      />

      <Footer />
    </div>
  )
}