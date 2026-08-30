// app/event/[eventId]/payment/lib/payment-status.ts
//
// Client for the (public, unauthenticated) GET /api/v1/event/payment/status
// route, plus the logic that turns its response into enough PaymentData +
// cart to re-render the checkout page when the buyer's sessionStorage
// didn't survive a refresh.
//
// ── Why this exists ─────────────────────────────────────────────────────
// Buyers sometimes step away mid-payment (e.g. to authorise a bank
// transfer or USSD prompt on their phone) and come back to find the tab
// reloaded. The backend already has the payment recorded — the reference
// created in createPaymentReference() is the durable link to it — so once
// EventPaymentClient stamps `?ref={reference}` onto the URL (see
// lib/url-ref.ts), a reload can look the reference up here and recover
// instead of showing "Payment Session Expired".

import { calculateVATFee, resolvePlatformFeeRates, type PlatformFeeRates } from "@/utils/priceUtility"
import type { CartItem, PaymentData } from "../types"

export type PaymentStatusValue = "pending" | "successful" | "failed" | "incorrect_payment"

export interface PaymentStatusResponse {
  success: boolean
  reference: string
  transactionType: string
  status: PaymentStatusValue
  eventId: string | null
  eventName: string | null
  ticketType: string | null
  totalTicketCount: number | null
  totalAmount: number | null
  createdAt: string | null
  message?: string
  /**
   * Non-PII order context, present when the reference carries enough of
   * the original checkout to rebuild the page — used only when local
   * storage is empty. Deliberately excludes the buyer's name/email/phone
   * and discount specifics: this endpoint is public and unauthenticated
   * (anyone holding the reference string can call it), and a resumed
   * "pending" reference is reopened as-is (see EventPaymentClient) rather
   * than recreated, so none of that is actually needed to resume.
   */
  recovery?: {
    eventCreatorId: string | null
    eventVenue: string | null
    eventType: string | null
    eventDate: string | null
    eventEndDate: string | null
    eventStart: string | null
    eventEnd: string | null
    stopDate: string | null
    bookerName: string | null
    bookerEmail: string | null
    ticketTypes: { type: string; quantity: number; price: number }[]
    /** Fee rates actually applied at purchase time — frozen on the reference
     *  so a resumed checkout matches what was really charged even if the
     *  event's fee config has since changed. null for older references. */
    appliedFeeRates: PlatformFeeRates | null
  }
}

export async function fetchPaymentStatus(reference: string): Promise<PaymentStatusResponse | null> {
  try {
    const res = await fetch(`/api/v1/event/payment/status?ref=${encodeURIComponent(reference)}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    console.error("Error fetching payment status:", error)
    return null
  }
}

/**
 * Rebuilds PaymentData + cart from a status response's `recovery` block —
 * only meaningful when the buyer's own sessionStorage cart/paymentData is
 * gone. `.vat` is synthesised the same way the original add-to-cart flow
 * computes it (see buy-ticket-dialog.tsx) so totals stay exact.
 */
export function buildRecoveredCheckout(
  status: PaymentStatusResponse
): { paymentData: PaymentData; cart: CartItem[] } | null {
  const r = status.recovery
  if (!r || !status.eventId || !status.eventName || r.ticketTypes.length === 0) return null

  // Prefer the rates frozen on the reference at purchase time; only fall
  // back to today's defaults for references old enough not to have them.
  const rates = r.appliedFeeRates ?? resolvePlatformFeeRates(null)

  const cart: CartItem[] = r.ticketTypes.map((t) => ({
    ticketType: t.type,
    quantity: t.quantity,
    price: t.price,
    vat: calculateVATFee(t.price, rates),
  }))

  const paymentData: PaymentData = {
    eventId: status.eventId,
    eventName: status.eventName,
    ticketType: status.ticketType || cart[0].ticketType,
    ticketPrice: status.totalAmount ?? 0,
    eventCreatorId: r.eventCreatorId || "",
    eventVenue: r.eventVenue || undefined,
    eventType: r.eventType || undefined,
    eventDate: r.eventDate || undefined,
    eventEndDate: r.eventEndDate || undefined,
    eventStart: r.eventStart || undefined,
    eventEnd: r.eventEnd || undefined,
    stopDate: r.stopDate || undefined,
    bookerName: r.bookerName || undefined,
    bookerEmail: r.bookerEmail || undefined,
  }

  return { paymentData, cart }
}
