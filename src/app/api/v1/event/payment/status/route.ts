/**
 * src/app/api/v1/event/payment/status/route.ts
 *
 * GET /api/v1/event/payment/status?ref={reference}
 *
 * Lets a ticket buyer self-serve check whether their payment reflected,
 * without needing to be logged in — mirrors /api/v1/polls/verify but for
 * ticket_purchase references. Takes only the payment reference and matches
 * it directly against the `Reference` collection (doc ID === reference).
 *
 * Returns:
 *   - transactionType
 *   - status  (pending | successful | failed | incorrect_payment)
 *   - eventId, eventName, ticketType, totalTicketCount, totalAmount, createdAt
 *   - recovery — non-PII order context (ticket breakdown + event details),
 *     included so the event checkout page can rebuild its cart/paymentData
 *     and resume a still-pending reference after losing sessionStorage
 *     (buyer stepped away mid-payment, tab got reloaded — see
 *     spotix-user/src/app/event/[eventId]/payment/lib/payment-status.ts).
 *     Deliberately excludes the buyer's name/email/phone and discount
 *     specifics: this route is public/unauthenticated, and a resumed
 *     pending reference is reopened as-is rather than recreated, so the
 *     checkout page never needs that identity to resume it.
 *
 * When the underlying gateway message indicates the buyer sent the wrong
 * amount, status is promoted to "incorrect_payment" — see
 * src/utils/paymentMessages.ts.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { resolveDisplayStatus, INCORRECT_PAYMENT_NOTICE } from "@/utils/paymentMessages"

function toIso(v: unknown): string | null {
  if (!v) return null
  if (typeof v === "string") return v
  if (typeof v === "object" && "seconds" in (v as any)) return new Date((v as any).seconds * 1000).toISOString()
  return null
}

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")?.trim()

  if (!ref) {
    return NextResponse.json({ error: "Enter your payment reference to search." }, { status: 400 })
  }

  try {
    const snap = await adminDb.collection("Reference").doc(ref).get()

    if (!snap.exists) {
      return NextResponse.json({ error: "No payment found for that reference. Double-check what you entered." }, { status: 404 })
    }

    const d = snap.data()!

    const failureMessage: string | null = d.failureReason ?? null
    const displayStatus = resolveDisplayStatus(d.status, failureMessage)

    return NextResponse.json({
      success:          true,
      reference:        ref,
      transactionType:  d.transactionType ?? "ticket_purchase",
      status:           displayStatus,
      eventId:          d.eventId ?? null,
      eventName:        d.eventName ?? null,
      ticketType:       d.ticketType ?? null,
      totalTicketCount: d.totalTicketCount ?? null,
      totalAmount:      d.totalAmount ?? null,
      createdAt:        toIso(d.updatedAt) ?? toIso(d.createdAt) ?? null,
      ...(displayStatus === "incorrect_payment" ? { message: INCORRECT_PAYMENT_NOTICE } : {}),
      // Only ticket_purchase references carry enough shape here to be
      // "resumable" — free-event / voting references don't need it.
      ...(d.transactionType !== "vote_purchase"
        ? {
            recovery: {
              eventCreatorId: d.eventCreatorId ?? null,
              eventVenue:     d.eventVenue ?? null,
              eventType:      d.eventType ?? null,
              eventDate:      d.eventDate ?? null,
              eventEndDate:   d.eventEndDate ?? null,
              eventStart:     d.eventStart ?? null,
              eventEnd:       d.eventEnd ?? null,
              stopDate:       d.stopDate ?? null,
              bookerName:     d.bookerName ?? null,
              bookerEmail:    d.bookerEmail ?? null,
              ticketTypes:    Array.isArray(d.ticketTypes) ? d.ticketTypes : [],
            },
          }
        : {}),
    })
  } catch (err) {
    console.error("[GET /api/v1/event/payment/status] Error:", err)
    return NextResponse.json({ error: "Failed to fetch payment status. Please try again." }, { status: 500 })
  }
}
