/**
 * app/api/v1/agent-ref/[refId]/route.ts
 * GET /api/v1/agent-ref/:refId
 *
 * Public, unauthenticated lookup — the buyer landing on /payment/agent
 * isn't necessarily a logged-in Spotix user, so this can't sit behind the
 * usual spotix_u_at auth check. Returns only what the confirmation page
 * needs to display: event summary, ticket details, buyer info (as entered
 * by the agent), agent name, and current status.
 *
 * Reads the SAME `Reference` collection the self-service checkout uses —
 * agent sales were written there deliberately (see the agent app's
 * POST /api/v1/agent/sale) so this page, the Paystack charge, and the
 * backend webhook all agree on one record.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ refId: string }> }
) {
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

    if (!r.isAgentSale) {
      // Not an agent-created reference — don't let this endpoint be used
      // as a generic reference lookup for self-service purchases.
      return NextResponse.json({ success: false, error: "This payment link is invalid" }, { status: 404 })
    }

    let eventImage = ""
    try {
      const eventDoc = await adminDb.collection("events").doc(r.eventId).get()
      eventImage = eventDoc.data()?.eventImage || ""
    } catch {
      // non-fatal — page still renders without the image
    }

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
      ticketType: r.ticketType,
      totalTicketCount: r.totalTicketCount,
      ticketPrice: r.ticketPrice,
      transactionFee: r.transactionFee,
      totalAmount: r.totalAmount,
      buyerFullName: r.userFullName,
      buyerEmail: r.userEmail,
      buyerPhone: r.userPhone,
      agentName: r.agentName,
      isFree: r.totalAmount === 0,
    })
  } catch (err: any) {
    console.error("[GET agent-ref] failed:", err)
    return NextResponse.json({ success: false, error: "Unable to load this payment link" }, { status: 500 })
  }
}
