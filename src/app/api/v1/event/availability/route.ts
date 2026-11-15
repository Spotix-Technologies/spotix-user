import { NextRequest, NextResponse } from "next/server"
import { fetchEventDocFromFirestore } from "@/app/lib/eventCache"
import { getTicketSaleStatus, describeSaleStatus, type TicketSaleWindowFields } from "@/utils/ticketSaleWindow"

/**
 * GET /api/v1/event/availability?eventId=...
 *
 * The one piece of an event's data that's deliberately NEVER cached.
 *
 * The general event doc (name, images, venue, description, ...) is served
 * cached via /api/v1/event (see lib/eventCache.ts) and is only busted by
 * booker/admin edits now — a ticket purchase no longer invalidates it (see
 * api/v1/atomic/route.ts). So anything that needs a live, right-now read of
 * "can this still be bought" reads through here instead, straight from
 * Firestore, on every call.
 *
 * Mirrors the exact same sold-out / on-sale rules already used client-side
 * (getRemaining() + getFreeEventSoldOut() in buy-ticket-dialog.tsx, and the
 * event-status effect in ClientPage.tsx) so the server-authoritative answer
 * here never disagrees with what the buyer was shown.
 */

interface TicketPriceDoc extends TicketSaleWindowFields {
  policy: string
  price?: number
  availableTickets?: number | string | null
  ticketsSold?: number
}

/**
 * Remaining tickets for a tier, or null if unlimited sale. A tier is only
 * ever "sold out" when availableTickets is explicitly the number 0 —
 * missing/null/empty/malformed is treated as unlimited, never coerced to 0.
 * Kept identical to getRemaining() in buy-ticket-dialog.tsx.
 */
function getRemaining(ticket: TicketPriceDoc): number | null {
  const raw = ticket.availableTickets
  if (raw === undefined || raw === null || (raw as unknown as string) === "") return null
  const num = Number(raw)
  if (!Number.isFinite(num)) return null
  return Math.max(0, num)
}

export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get("eventId")

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: eventId is required" },
        { status: 400 }
      )
    }

    // Always a live Firestore read — this route never touches the Redis
    // cache eventCache.ts fronts for the rest of the event doc.
    const eventData = await fetchEventDocFromFirestore(eventId)

    if (!eventData) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })
    }

    const now = new Date()

    const eventEndDate = eventData.eventEndDate ? new Date(eventData.eventEndDate) : null
    const isEventPassed = !!eventEndDate && !isNaN(eventEndDate.getTime()) && now > eventEndDate

    // Event-wide "stop all sales" deadline — same guard as isSaleEnded in
    // ClientPage.tsx's event-status effect.
    const stopDateEnabled = !!eventData.enableStopDate && !!eventData.stopDate
    const isSaleEnded = stopDateEnabled ? now > new Date(eventData.stopDate) : false
    const eventWideStop = { enabled: stopDateEnabled, stopDate: eventData.stopDate ?? null }

    // Event-wide sold-out (maxSize cap) — same guard as isSoldOut in
    // ClientPage.tsx's event-status effect / getFreeEventSoldOut() in
    // buy-ticket-dialog.tsx. Applies regardless of isFree.
    const maxSizeEnabled = !!eventData.enableMaxSize && !!eventData.maxSize
    const ticketsSoldTotal = Number(eventData.ticketsSold) || 0
    const isSoldOut = maxSizeEnabled ? ticketsSoldTotal >= parseInt(String(eventData.maxSize)) : false

    const ticketPrices: TicketPriceDoc[] = Array.isArray(eventData.ticketPrices) ? eventData.ticketPrices : []

    const tickets = ticketPrices.map((ticket) => {
      const remaining = getRemaining(ticket)
      const saleStatus = getTicketSaleStatus(ticket, eventWideStop, now)
      return {
        policy: ticket.policy,
        ticketsSold: Number(ticket.ticketsSold) || 0,
        availableTickets: remaining, // null = unlimited
        soldOut: remaining !== null && remaining === 0,
        onSale: saleStatus.onSale,
        saleStatusReason: saleStatus.onSale ? null : saleStatus.reason,
        saleStatusMessage: describeSaleStatus(saleStatus),
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          eventId: eventData.id,
          isFree: !!eventData.isFree,
          ticketsSold: ticketsSoldTotal,
          isEventPassed,
          isSoldOut,
          isSaleEnded,
          tickets,
        },
      },
      {
        status: 200,
        // Deliberately the opposite of /api/v1/event — never cached, not
        // even at the edge, so every call reflects Firestore right now.
        headers: { "Cache-Control": "no-store" },
      }
    )
  } catch (error) {
    console.error("Error fetching event availability:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    )
  }
}
