/**
 * src/app/api/v1/create-merch-ref/route.ts
 *
 * Creates a Paystack payment reference for a merch purchase — the merch
 * equivalent of create-pay-ref/route.ts. Same conventions:
 *   - Reference format identical to tickets: SPTX-REF-{timestamp}-{AA}
 *     (see buildMerchReference in lib/reference-id.ts) — dispatch at
 *     webhook time keys off `transactionType`/metadata "type"
 *     ("merch_purchase"), not the reference string shape.
 *   - Nothing money-related is trusted from the client: price and stock
 *     are re-read from Supabase (merch_listings) right here, server-side.
 *   - Fee burden (who covers the 5% Spotix fee and/or the Paystack fee) is
 *     resolved PER LISTING from that listing's own `fee_burden` column in
 *     Supabase (set by the booker per-product from Manage Listings) — NOT
 *     the event's Firestore Burden-of-Fee setting, which is a ticket-only
 *     concept. Pricing is per unit via computeMerchLinePricing(), summed
 *     across lines — see priceUtility.ts for why this differs from
 *     computeOrderPricing() (tickets' order-wide model).
 *
 * Unlike tickets, merch has a hard stock ceiling (merch_listings.quantity)
 * enforced here as a courtesy check, and again atomically inside
 * record_merch_order() at webhook time (the only place stock is actually
 * decremented) — this route only reads Supabase, never writes to it.
 *
 * One deliberate deviation from create-pay-ref's response shape: this
 * route also returns `totalAmount`. Ticket checkout (EventPaymentClient)
 * already independently recomputes the same VAT/fee-burden math
 * client-side (for on-page display) and just reuses that figure for the
 * Paystack widget's `amount`. Merch checkout has no such client-side
 * pricing display to reuse, so the authoritative totalAmount is handed
 * back here instead of duplicating resolveFeeBurden/computeOrderPricing
 * logic in the browser.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { auth } from "firebase-admin"
import { buildMerchReference } from "@/app/lib/reference-id"
import { computeMerchLinePricing } from "@/utils/priceUtility"
import { getMerchListingById } from "@/app/lib/merch-listings"

const MAX_QTY_PER_ITEM = 10

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      eventId,
      eventCreatorId,
      eventName,
      items, // [{ listingId, quantity }]
      guestEmail,
      guestFullName,
      guestPhone,
      userFullName,
      userEmail: bodyUserEmail,
      userPhone,
      // Shipping/contact details for the order — required by merch_orders
      // (full_name, email, phone_number, address are all NOT NULL columns).
      buyerAddress,
    } = body

    // ── Auth — optional for guests, same as create-pay-ref ─────────────────────
    const authHeader = request.headers.get("Authorization")
    let userId: string | null = null
    let userEmail: string | null = null

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1]
      try {
        const decodedToken = await auth().verifyIdToken(idToken)
        userId = decodedToken.uid
        userEmail = decodedToken.email || null
      } catch {
        // Invalid/expired token — fall through to guest checkout
      }
    }

    const finalUserEmail = userEmail || bodyUserEmail || guestEmail || null
    const finalUserId = userId || null // unlike tickets, we don't fall back to email-as-id — buyer_user_id is a real Firebase uid or null (guest) in merch_orders
    const finalUserFullName = userFullName || guestFullName || null
    const finalUserPhone = userPhone || guestPhone || null

    if (!finalUserEmail) {
      return NextResponse.json({ error: "A buyer email is required" }, { status: 400 })
    }
    if (!finalUserFullName?.trim()) {
      return NextResponse.json({ error: "A buyer full name is required" }, { status: 400 })
    }
    if (!finalUserPhone?.trim()) {
      return NextResponse.json({ error: "A buyer phone number is required" }, { status: 400 })
    }
    if (!buyerAddress?.trim()) {
      return NextResponse.json({ error: "A delivery address is required" }, { status: 400 })
    }

    // ── Validate presence of core fields ────────────────────────────────────
    if (!eventId || !eventCreatorId) {
      return NextResponse.json(
        { error: "Missing required fields: eventId, eventCreatorId" },
        { status: 400 }
      )
    }

    const requestedItems: { listingId: string; quantity: number }[] = Array.isArray(items)
      ? items.map((it: any) => ({ listingId: String(it.listingId || ""), quantity: Number(it.quantity) || 1 }))
      : []

    if (requestedItems.length === 0) {
      return NextResponse.json({ error: "Missing required field: items (non-empty array)" }, { status: 400 })
    }

    for (const item of requestedItems) {
      if (!item.listingId) {
        return NextResponse.json({ error: "Every item needs a listingId" }, { status: 400 })
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QTY_PER_ITEM) {
        return NextResponse.json(
          { error: `Invalid quantity for item "${item.listingId}" — must be a whole number between 1 and ${MAX_QTY_PER_ITEM}` },
          { status: 400 }
        )
      }
    }

    // ── Load the event doc — needed for suspended check + Burden of Fee ────────
    const eventRef = adminDb.collection("events").doc(eventId)
    const eventSnap = await eventRef.get()
    if (!eventSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    const eventDoc = eventSnap.data()!

    if (eventDoc.suspended) {
      return NextResponse.json({ error: "This event is currently unavailable" }, { status: 403 })
    }

    // ── Recompute pricing + stock server-side from Supabase — never trust
    // the client's price/name/stock ────────────────────────────────────────
    // Merch is billed PER UNIT, per LISTING — unlike tickets, the fee
    // burden here comes from each listing's own `fee_burden` column in
    // Supabase (set by the booker per-product from Manage Listings), not
    // the event's Firestore Burden-of-Fee setting. Different listings in
    // the same cart can carry different fee_burden values even though
    // they share a booker, so every line is priced independently via
    // computeMerchLinePricing() — see priceUtility.ts's header comment on
    // why Paystack's fee is computed per unit and multiplied by quantity,
    // rather than once on the line/order subtotal the way tickets do it.
    const merchItemsWithBreakdown: {
      listingId: string
      productName: string
      quantity: number
      price: number
      lineTotal: number
      feeBurden: { coversSpotixFee: boolean; coversPaystackFee: boolean; paystackFeeAbsorbedBy: "organizer" | "spotix" }
      spotixFeeAmount: number
      paystackFeeShare: number
      organizerNetAmount: number
    }[] = []
    let subtotal = 0
    let totalUnitsCount = 0
    let transactionFee = 0
    let totalAmount = 0
    let orderPaystackFeeTotal = 0
    let orderPaystackFeeChargedToBuyer = 0
    let orderOrganizerPaystackFeeCost = 0

    for (const item of requestedItems) {
      const listing = await getMerchListingById(item.listingId)
      if (!listing) {
        return NextResponse.json({ error: `Listing "${item.listingId}" was not found` }, { status: 404 })
      }
      if (listing.bookerId !== eventCreatorId) {
        return NextResponse.json({ error: `Listing "${item.listingId}" does not belong to this event's organizer` }, { status: 400 })
      }
      if (listing.status !== "active") {
        return NextResponse.json({ error: `"${listing.productName}" is not currently on sale` }, { status: 400 })
      }
      if (listing.quantity < item.quantity) {
        return NextResponse.json(
          { error: `Only ${listing.quantity} left of "${listing.productName}" — please reduce the quantity` },
          { status: 400 }
        )
      }

      // This listing's own fee_burden — the source of truth for who pays
      // on this line, straight from Supabase (see merch-listings.ts).
      const lineFeeBurden = {
        coversSpotixFee: listing.feeBurden.coversSpotixFee,
        coversPaystackFee: listing.feeBurden.coversPaystackFee,
        paystackFeeAbsorbedBy: "organizer" as const,
      }

      const linePricing = computeMerchLinePricing({
        unitPrice: listing.price,
        quantity: item.quantity,
        feeBurden: lineFeeBurden,
      })

      merchItemsWithBreakdown.push({
        listingId: listing.id,
        productName: listing.productName,
        quantity: item.quantity,
        price: listing.price,
        lineTotal: linePricing.lineSubtotal,
        feeBurden: lineFeeBurden,
        spotixFeeAmount: linePricing.spotixFeeTotal,
        paystackFeeShare: linePricing.paystackFeeTotal,
        organizerNetAmount: linePricing.organizerNetAmount,
      })

      subtotal += linePricing.lineSubtotal
      totalUnitsCount += item.quantity
      transactionFee += linePricing.spotixFeeTotal
      totalAmount += linePricing.linePayable
      orderPaystackFeeTotal += linePricing.paystackFeeTotal
      orderPaystackFeeChargedToBuyer += linePricing.paystackFeeChargedToBuyer
      orderOrganizerPaystackFeeCost += linePricing.organizerPaystackFeeCost
    }

    // Order-level feeBurden field kept for parity with ticket references —
    // representative of the cart's first line. Per-line billing above is
    // what's actually authoritative; spotix-backend reads feeBurden off
    // each line in merchItems, never this top-level copy.
    const feeBurden = merchItemsWithBreakdown[0].feeBurden

    console.log(
      `[create-merch-ref] subtotal=${subtotal} spotixFee=${transactionFee} ` +
      `paystackFee=${orderPaystackFeeTotal} totalAmount=${totalAmount} lines=`,
      merchItemsWithBreakdown.map((l) => ({ listingId: l.listingId, qty: l.quantity, feeBurden: l.feeBurden }))
    )

    // ── Generate reference — identical shape to ticket references ──────────────
    const timestamp = Date.now()
    const reference = buildMerchReference(timestamp)

    // ── Build Firestore document ────────────────────────────────────────────────
    const paymentReference = {
      reference,
      transactionType: "merch_purchase",
      userId: finalUserId,
      userEmail: finalUserEmail,
      userFullName: finalUserFullName,
      userPhone: finalUserPhone,
      isGuest: !finalUserId,
      eventId,
      eventCreatorId,
      eventName: eventName || "",

      // Delivery details — required for merch_orders (full_name/email/
      // phone_number/address are all NOT NULL there).
      buyerAddress,

      // Canonical cart — merch.js reads merchItems to write one order per
      // line. Each line carries its own feeBurden/spotixFeeAmount/
      // paystackFeeShare/organizerNetAmount (see merchItemsWithBreakdown
      // above) — spotix-backend reads these straight off the line rather
      // than re-deriving fee-burden math itself.
      merchItems: merchItemsWithBreakdown,
      totalUnitsCount,
      merchSubtotal: subtotal, // sum of line totals, before fee — also what's paid out per-item at webhook time

      totalAmount,     // grand total incl. fee, server-recomputed — what the buyer is actually charged
      transactionFee,  // Spotix's 5% fee amount, summed across lines — always this, regardless of who paid for it
      feeBurden,       // representative only — see per-line feeBurden in merchItems above
      buyerBearsBurden: !feeBurden.coversSpotixFee, // kept for parity with ticket references
      paystackFee: orderPaystackFeeTotal,
      paystackFeeChargedToBuyer: orderPaystackFeeChargedToBuyer,
      organizerPaystackFeeCost: orderOrganizerPaystackFeeCost,

      vendor: "paystack",
      status: "pending",
      paymentCreationDate: new Date().toISOString(),
      paymentCreationTimestamp: timestamp,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const referenceDocRef = adminDb.collection("Reference").doc(reference)
    await referenceDocRef.set(paymentReference)

    console.log(`[create-merch-ref] Reference stored successfully: ${reference}`)

    return NextResponse.json(
      { success: true, reference, totalAmount, message: "Payment reference created successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("[create-merch-ref] Unhandled error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
