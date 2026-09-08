/**
 * utils/ticketSaleWindow.ts
 *
 * Resolves whether a given ticket TYPE (not the whole event) is currently
 * on sale — the consumption-side half of item 6 from the Sep 2026
 * create-event renovation (spotix-booker's Pricing tab lets an organizer
 * set saleStartDate/saleStartTime/saleEndDate/saleEndTime per ticket
 * type, e.g. an "At the Gate" tier that only starts selling the day of
 * the event).
 *
 * Plain, dependency-free TS — safe to import from both "use client"
 * components (buy-ticket-dialog.tsx) and server-only API routes
 * (create-pay-ref, ref/free), so the exact same rule governs what the
 * buyer sees and what the server actually allows to be purchased.
 */

export interface TicketSaleWindowFields {
  saleStartDate?: string | null // "YYYY-MM-DD"
  saleStartTime?: string | null // "HH:mm"
  saleEndDate?: string | null
  saleEndTime?: string | null
}

export interface EventWideStop {
  /** Only treated as a real upper bound when this is true AND stopDate is
   *  set — matches how spotix-booker only ever writes a non-null stopDate
   *  when "Stop Sale for ALL Ticket Types" was actually enabled. */
  enabled?: boolean
  stopDate?: string | null
}

function combine(date?: string | null, time?: string | null): Date | null {
  if (!date) return null
  const safeTime = time && /^\d{1,2}:\d{2}$/.test(time) ? time : "00:00"
  const d = new Date(`${date}T${safeTime}:00`)
  return isNaN(d.getTime()) ? null : d
}

export interface TicketSaleWindow {
  startsAt: Date | null
  endsAt: Date | null
}

/**
 * A ticket type's effective sale window:
 *  - No saleStartDate  → no lower bound (on sale as soon as the event is published)
 *  - No saleEndDate    → falls back to the event-wide "stop all sales" deadline,
 *                        when that's enabled; otherwise no upper bound at all
 * This mirrors the "Leave blank to..." helper text on the Pricing tab exactly.
 */
export function resolveTicketSaleWindow(
  ticket: TicketSaleWindowFields,
  eventWideStop: EventWideStop = {}
): TicketSaleWindow {
  const startsAt = combine(ticket.saleStartDate, ticket.saleStartTime)
  const perTicketEnd = combine(ticket.saleEndDate, ticket.saleEndTime)
  let endsAt = perTicketEnd
  if (!endsAt && eventWideStop.enabled && eventWideStop.stopDate) {
    const fallback = new Date(eventWideStop.stopDate)
    endsAt = isNaN(fallback.getTime()) ? null : fallback
  }
  return { startsAt, endsAt }
}

export type TicketSaleStatus =
  | { onSale: true }
  | { onSale: false; reason: "not-started"; startsAt: Date }
  | { onSale: false; reason: "ended"; endsAt: Date }

export function getTicketSaleStatus(
  ticket: TicketSaleWindowFields,
  eventWideStop: EventWideStop = {},
  now: Date = new Date()
): TicketSaleStatus {
  const { startsAt, endsAt } = resolveTicketSaleWindow(ticket, eventWideStop)
  if (startsAt && now < startsAt) return { onSale: false, reason: "not-started", startsAt }
  if (endsAt && now >= endsAt) return { onSale: false, reason: "ended", endsAt }
  return { onSale: true }
}

/** Short human-readable line for UI badges/messages. */
export function describeSaleStatus(status: TicketSaleStatus): string | null {
  if (status.onSale) return null
  if (status.reason === "not-started") {
    return `On sale from ${status.startsAt.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`
  }
  return "Sales ended for this ticket"
}
