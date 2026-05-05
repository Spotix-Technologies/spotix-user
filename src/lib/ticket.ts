/**
 * src/lib/ticket.ts
 *
 * Reusable ticket PDF generator.
 * Used by:
 *   - src/app/ticket-history/[ticketId]/page.tsx  (single ticket download)
 *   - src/app/payment/success/PaystackSuccessClient.tsx (bulk auto-download after purchase)
 */

import jsPDF from "jspdf"

export interface TicketPDFParams {
  ticketId: string
  eventName: string
  eventType: string
  ticketType: string
  ticketPrice: number
  ticketReference: string
  purchaseDate: string
  purchaseTime: string
  eventDate?: string
  eventStart?: string
  eventEnd?: string
  eventVenue?: string
  giftedBy?: string
  gifterName?: string
  giftNote?: string
  /** Pre-rasterised QR PNG data URL — pass null to render a placeholder */
  qrPngDataUrl: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDisplayDate(dateString: string): string {
  if (!dateString) return "Not specified"
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return dateString
  }
}

function formatDisplayTime(timeString: string): string {
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

// ── Rasterise the react-qr-code SVG from a wrapper element ───────────────────

/**
 * Given a wrapper HTMLElement that contains a react-qr-code <svg>, convert it
 * to a PNG data URL suitable for embedding in jsPDF.
 *
 * Returns null if no SVG is found or if rendering fails.
 */
export async function rasteriseQRFromWrapper(
  wrapperEl: HTMLElement | null
): Promise<string | null> {
  return new Promise((resolve) => {
    const svgEl = wrapperEl?.querySelector("svg")
    if (!svgEl) { resolve(null); return }

    const SIZE = 300

    const clone = svgEl.cloneNode(true) as SVGElement
    clone.setAttribute("width", String(SIZE))
    clone.setAttribute("height", String(SIZE))
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

// ── Core PDF builder ──────────────────────────────────────────────────────────

/**
 * Build and save (or return bytes for) a Spotix ticket PDF.
 *
 * @param params  All ticket data + optional pre-rasterised QR PNG
 * @param save    If true (default), calls doc.save() automatically
 * @returns       The jsPDF instance (in case the caller needs the raw bytes)
 */
export function buildTicketPDF(params: TicketPDFParams, save = true): jsPDF {
  const {
    ticketId,
    eventName,
    eventType,
    ticketType,
    ticketPrice,
    ticketReference,
    purchaseDate,
    purchaseTime,
    eventDate,
    eventStart,
    eventEnd,
    eventVenue,
    giftedBy,
    gifterName,
    giftNote,
    qrPngDataUrl,
  } = params

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
  doc.text((eventType || "EVENT").toUpperCase(), margin, 36)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(255, 255, 255)
  const eventNameLines = doc.splitTextToSize(eventName, contentW - 80)
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

  const dateStr = eventDate ? formatDisplayDate(eventDate) : "Not specified"
  value(dateStr, col1, y, { size: 10 })

  const venueStr   = eventVenue || "Not specified"
  const venueLines = doc.splitTextToSize(venueStr, contentW / 2 - 10)
  value(venueLines[0], col2, y, { size: 10 })
  y += 16

  if (eventStart) {
    const timeStr = `${formatDisplayTime(eventStart)}${
      eventEnd ? " – " + formatDisplayTime(eventEnd) : ""
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

  value(ticketType, col1, y)
  value(
    ticketPrice === 0 ? "Free" : `N${ticketPrice.toLocaleString()}`,
    col3,
    y,
    { color: [107, 47, 165], size: 13 }
  )
  value(ticketReference, col4, y, { mono: true, size: 9 })

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
  value(purchaseDate, col1, y, { size: 10 })
  value(purchaseTime, col2, y, { size: 10 })
  y += 34

  // ── Gift Banner ───────────────────────────────────────────────
  if (giftedBy) {
    const bannerH = giftNote ? 56 : 36
    doc.setFillColor(245, 237, 255)
    doc.setDrawColor(200, 170, 230)
    doc.roundedRect(margin, y, contentW, bannerH, 6, 6, "FD")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(107, 47, 165)
    doc.text(
      `Gifted to you by ${gifterName || giftedBy}`,
      margin + 12,
      y + 16
    )
    if (giftNote) {
      doc.setFont("helvetica", "italic")
      doc.setFontSize(8)
      doc.setTextColor(130, 80, 180)
      doc.text(`"${giftNote}"`, margin + 12, y + 32)
    }
    y += bannerH + 16
  }

  // ── QR Code ───────────────────────────────────────────────────
  const qrSize = 130
  const qrX    = pageW / 2 - qrSize / 2

  if (qrPngDataUrl) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(220, 220, 220)
    doc.roundedRect(qrX - 8, y - 8, qrSize + 16, qrSize + 16, 6, 6, "FD")
    doc.addImage(qrPngDataUrl, "PNG", qrX, y, qrSize, qrSize)
  } else {
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

  if (save) {
    doc.save(`ticket-${ticketReference}.pdf`)
  }

  return doc
}

/**
 * Convenience wrapper: generate and download a ticket PDF from params.
 * Handles the rasteriseQR step separately (pass the wrapper element).
 *
 * Usage:
 *   await downloadTicketPDF(params, qrWrapperRef.current)
 */
export async function downloadTicketPDF(
  params: Omit<TicketPDFParams, "qrPngDataUrl">,
  qrWrapperEl: HTMLElement | null
): Promise<void> {
  const qrPngDataUrl = await rasteriseQRFromWrapper(qrWrapperEl)
  buildTicketPDF({ ...params, qrPngDataUrl })
}
