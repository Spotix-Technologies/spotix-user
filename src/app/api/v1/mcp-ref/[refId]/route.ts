/**
 * app/api/v1/mcp-ref/[refId]/route.ts
 * GET /api/v1/mcp-ref/:refId
 *
 * Public, unauthenticated lookup backing /payment/mcp/[refId] — the buyer
 * lands here straight from an AI chat client (Claude, ChatGPT, Gemini via
 * spotix-mcp's create_ticket_order tool), never a logged-in browser
 * session, so this can't sit behind the usual spotix_u_at auth check.
 * Returns only what the payment page needs to display: event summary,
 * ticket types/quantities, buyer info (as supplied to the MCP tool), and
 * current status.
 *
 * Reads the SAME `Reference` collection every other checkout surface
 * writes to (see spotix-backend's v1/lib/mcp/orders.js#createOrder) — this
 * page, the Paystack inline charge it opens, and the backend webhook all
 * agree on one record. Mirrors app/api/v1/agent-ref/[refId]/route.ts,
 * gated on `channel === "mcp"` instead of `isAgentSale`.
 *
 * IP rate limited (same Upstash-backed fixed-window limiter as
 * api/v1/polls/nominate/route.ts) — public + unauthenticated means it's
 * also the easiest endpoint on this surface to enumerate references
 * against, so it shouldn't go unlimited just because it's read-only.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { checkRateLimit } from "@/app/lib/redis"
import { getRequestIp } from "@/app/lib/request-ip"

// Generous enough for a real buyer refreshing/loading this page a few
// times, tight enough that one script can't enumerate references — same
// shape as api/v1/polls/nominate/route.ts's IP-keyed limiter.
const RATE_LIMIT_PER_MINUTE = 20

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ refId: string }> }
) {
  const ip = getRequestIp(req)
  const { allowed } = await checkRateLimit(`rl:mcp-ref:${ip}`, RATE_LIMIT_PER_MINUTE)
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down and try again shortly." },
      { status: 429 }
    )
  }

  const { refId } = await params

  if (!refId) {
    return NextResponse.json({ success: false, error: "Reference is required" }, { status: 400 })
  }

  try {
    const refDoc = await adminDb.collection("Reference").doc(refId).get()
    if (!refDoc.exists) {
      return NextResponse.json({ success: false, error: "This payment link is invalid or has expired" }, { status: 404 })
    }

    const r = refDoc.data()!

    if (r.channel !== "mcp") {
      // A real reference, just not one create_ticket_order minted — don't
      // let this endpoint double as a generic reference lookup for
      // self-service/agent purchases, but say so plainly rather than
      // telling the caller it's "invalid", which it isn't.
      return NextResponse.json(
        { success: false, error: "This reference is valid, but it wasn't created by the Spotix MCP Server, so it can't be paid from this page." },
        { status: 404 }
      )
    }

    let eventImage = ""
    try {
      const eventDoc = await adminDb.collection("events").doc(r.eventId).get()
      eventImage = eventDoc.data()?.eventImage || ""
    } catch {
      // non-fatal — page still renders without the image
    }

    const ticketTypes = Array.isArray(r.ticketTypes) && r.ticketTypes.length
      ? r.ticketTypes
      : [{ type: r.ticketType, quantity: r.totalTicketCount, price: r.ticketPrice }]

    return NextResponse.json({
      success: true,
      reference: r.reference,
      status: r.status,
      eventId: r.eventId,
      eventName: r.eventName,
      eventImage,
      eventVenue: r.eventVenue,
      eventDate: r.eventDate,
      eventStart: r.eventStart,
      eventEnd: r.eventEnd,
      eventCreatorId: r.eventCreatorId,
      ticketTypes,
      totalTicketCount: r.totalTicketCount,
      ticketPrice: r.ticketPrice,
      transactionFee: r.transactionFee,
      totalAmount: r.totalAmount,
      buyerFullName: r.userFullName,
      buyerEmail: r.userEmail,
      buyerPhone: r.userPhone,
      isFree: r.totalAmount === 0,
    })
  } catch (err: any) {
    console.error("[GET mcp-ref] failed:", err)
    return NextResponse.json({ success: false, error: "Unable to load this payment link" }, { status: 500 })
  }
}
