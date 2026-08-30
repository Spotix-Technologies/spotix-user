import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { auth } from "firebase-admin"
import { buildTicketReference } from "@/app/lib/reference-id"
import { calculateVATFee, resolvePlatformFeeRates, resolveFeeBurden, computeOrderPricing, type AddonInput } from "@/utils/priceUtility"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      eventId,
      eventCreatorId,
      ticketType,       
      ticketTypes,      
      discountCode,
      discountData,
      referralCode,
      referralData,
      eventName,
      eventVenue,
      eventDate,
      eventEndDate,
      eventStart,
      eventEnd,
      guestEmail,
      guestFullName,
      guestPhone,
      // Extra fields passed from PaymentClient (stored on ref for ticket.js to use)
      bookerName,
      bookerEmail,
      stopDate,
      eventType,
      userFullName,
      userEmail: bodyUserEmail,
      userPhone,
      // Event-survey answers, if the event required a form. Stored inert on
      // the reference doc — the backend's ticket-generation pipeline
      // (v1/lib/ticket/survey-delivery.js) is what actually delivers these,
      // and only once payment is confirmed successful. Never written to
      // events/{eventId}/responses from here.
      surveyResponses,
      // NOTE: the client also sends ticketPrice, totalAmount, transactionFee,
      // and discountAmount — these are NO LONGER trusted. Everything money-
      // related is recomputed below from the event's own Firestore doc, so a
      // tampered client request can't buy a ticket below its real price or
      // forge a discounted/zeroed platform fee.
    } = body

    // ── Auth — optional for guests ─────────────────────────────────────────────
    const authHeader = request.headers.get("Authorization")
    let userId: string | null = null
    let userEmail: string | null = null

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1]
      try {
        const decodedToken = await auth().verifyIdToken(idToken)
        userId = decodedToken.uid
        userEmail = decodedToken.email || null
        // console.log(`[create-pay-ref] Authenticated user: ${userId}`)
      } catch (error) {
        // console.log("[create-pay-ref] Token verification failed — allowing guest checkout")
      }
    }

    // Use bodyUserEmail (from guest checkout form) if no authenticated userId
    // For guests, the email serves as their identifier
    const finalUserEmail = userEmail || bodyUserEmail || guestEmail || null
    const finalUserId = userId || (finalUserEmail ? finalUserEmail : null) // Use email as ID for guests

    if (!finalUserId && !finalUserEmail) {
      return NextResponse.json(
        { error: "Either authentication or user email is required" },
        { status: 400 }
      )
    }

    // ── Validate presence of core fields ────────────────────────────────────
    if (!eventId || !eventCreatorId) {
      console.error("[create-pay-ref] Missing required fields", { eventId, eventCreatorId })
      return NextResponse.json(
        { error: "Missing required fields: eventId, eventCreatorId" },
        { status: 400 }
      )
    }

    // ── Normalise the ticket types the client asked to buy ─────────────────────
    // ticketTypes is the canonical field: [{ type, quantity, price }]
    // If only the legacy ticketType string was sent, promote it to the array shape.
    // `price` here is what the CLIENT thinks it is — it's only used as a hint
    // for legacy single-item requests; it is never trusted for the actual charge.
    let requestedTicketTypes: { type: string; quantity: number; price: number }[] = []

    if (ticketTypes && Array.isArray(ticketTypes) && ticketTypes.length > 0) {
      requestedTicketTypes = ticketTypes.map((item: any) => ({
        type: item.type || item.ticketType || "",
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
      }))
    } else if (ticketType) {
      // Legacy fallback
      requestedTicketTypes = [{ type: ticketType, quantity: 1, price: 0 }]
    }

    if (requestedTicketTypes.length === 0) {
      console.error("[create-pay-ref] No valid ticket type info found in request")
      return NextResponse.json(
        { error: "Missing required fields: ticketTypes array (or ticketType) is required" },
        { status: 400 }
      )
    }

    // Reject non-integer or non-positive quantities outright, before we ever
    // touch Firestore pricing — same cap as the buyer-facing dialog (10 per
    // ticket type per order), enforced again here since the client can't be
    // trusted to have kept to it.
    const MAX_QTY_PER_TYPE = 10
    for (const item of requestedTicketTypes) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QTY_PER_TYPE) {
        return NextResponse.json(
          { error: `Invalid quantity for "${item.type}" — must be a whole number between 1 and ${MAX_QTY_PER_TYPE}` },
          { status: 400 }
        )
      }
      if (!item.type) {
        return NextResponse.json({ error: "Every ticket type entry needs a type/policy name" }, { status: 400 })
      }
    }

    // ── Load the event doc — source of truth for pricing ────────────────────
    const eventRef = adminDb.collection("events").doc(eventId)
    const eventSnap = await eventRef.get()
    if (!eventSnap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }
    const eventDoc = eventSnap.data()!

    if (eventDoc.suspended) {
      return NextResponse.json({ error: "This event is currently unavailable" }, { status: 403 })
    }

    // Canonical policy → price lookup, straight off the event doc. Anything
    // the client sent for `price` is ignored from here on.
    const canonicalPriceByPolicy = new Map<string, number>(
      (Array.isArray(eventDoc.ticketPrices) ? eventDoc.ticketPrices : []).map((t: any) => [
        String(t.policy),
        Number(t.price) || 0,
      ])
    )

    // ── Recompute pricing server-side ───────────────────────────────────────
    // Admin-configured (or default) platform fee for THIS event — see
    // resolvePlatformFeeRates() for the exact fallback rules (missing
    // percentage → 5% default, missing flat fee → ₦0, not the ₦100 default).
    const feeRates = resolvePlatformFeeRates(eventDoc)

    // Burden of Fee: who pays which fee, per the organizer's own event
    // setting (spotix-booker → Overview → Burden of Fee, gear icon for the
    // granular Paystack-vs-Spotix split). Frozen onto the reference below
    // so a later toggle can never rewrite what this purchase already
    // settled as — spotix-backend's admin-sales step reads it straight
    // off the reference at ticket-generation time.
    //
    // feeBurden.paystackFeeAbsorbedBy ("organizer" | "spotix") is a further,
    // admin-only dimension of the Paystack half — organizers can only
    // choose to cover Paystack's fee themselves (coversPaystackFee); they
    // can't shift it onto Spotix's own books. resolveFeeBurden() carries
    // this straight through from the event doc, no separate handling
    // needed here.
    const feeBurden = resolveFeeBurden(eventDoc)

    // Active addons on this event (spotix-admin's Addons tab) — fetched
    // fresh here, never trusted from the client, same as ticket prices.
    const addonsSnap = await eventRef.collection("addons").get()
    const activeAddons: AddonInput[] = addonsSnap.docs
      .map((d) => {
        const a = d.data()
        return {
          id: d.id,
          name: a.name ?? "",
          pricePerTicket: typeof a.pricePerTicket === "number" ? a.pricePerTicket : 0,
          coveredBy: a.coveredBy === "organizer" ? ("organizer" as const) : ("attendee" as const),
          active: a.active !== false,
        }
      })
      .filter((a) => a.active)
      .map(({ active, ...rest }) => rest)

    const normalisedTicketTypes: { type: string; quantity: number; price: number }[] = []
    let subtotal = 0
    let totalVat = 0

    for (const item of requestedTicketTypes) {
      const canonicalPrice = canonicalPriceByPolicy.get(item.type)
      if (canonicalPrice === undefined) {
        return NextResponse.json(
          { error: `"${item.type}" is not a valid ticket type for this event` },
          { status: 400 }
        )
      }

      normalisedTicketTypes.push({ type: item.type, quantity: item.quantity, price: canonicalPrice })
      subtotal += canonicalPrice * item.quantity
      totalVat += calculateVATFee(canonicalPrice, feeRates) * item.quantity
    }

    // Derive the primary ticketType string from the first item in the array
    // (used for backwards-compat fields on the reference doc)
    const primaryTicketType = normalisedTicketTypes[0].type

    // Total ticket count across all types
    const totalTicketCount = normalisedTicketTypes.reduce((sum, item) => sum + item.quantity, 0)

    // Discount is a separate system (validated against /api/v1/discount at
    // apply-time) — trusted here for its amount, but clamped so it can never
    // push the subtotal below zero regardless of what the client sends.
    const requestedDiscountAmount = Number(body.discountAmount) || 0
    const discountAmount = Math.min(Math.max(requestedDiscountAmount, 0), subtotal)

    const ticketPrice = subtotal - discountAmount // subtotal after discount, before fee

    // Spotix's fee, Paystack's fee, and addons — all resolved together
    // against this event's Burden of Fee setting. This is the one
    // authoritative computation; everything downstream (totalAmount,
    // what's frozen on the reference, what spotix-backend later deducts
    // from payout) comes from this single call.
    const orderPricing = computeOrderPricing({
      ticketSubtotal: ticketPrice,
      totalTicketCount,
      spotixFeeTotal: totalVat,
      feeBurden,
      addons: activeAddons,
    })

    const transactionFee = orderPricing.spotixFeeTotal
    const totalAmount = orderPricing.totalPayable

    console.log(
      `[create-pay-ref] Recomputed subtotal=${subtotal} discount=${discountAmount} ` +
      `spotixFee=${orderPricing.spotixFeeTotal} paystackFee=${orderPricing.paystackFeeTotal} ` +
      `addonFeeTotal=${orderPricing.addonFeeTotal} totalAmount=${totalAmount} feeBurden=`,
      feeBurden
    )

    // ── Generate reference ────────────────────────────────────────────────────
    // 2 random letters appended after the timestamp so two requests landing
    // in the same millisecond (concurrent checkout traffic) can't collide
    // on the same Reference doc ID — see src/app/lib/reference-id.ts.
    const timestamp = Date.now()
    const reference = buildTicketReference(timestamp)
    console.log(`[create-pay-ref] Generated reference: ${reference}`)

    // ── Build Firestore document ───────────────────────────────────────────────
    // Use finalUserEmail/userFullName/userPhone already defined above
    const finalUserFullName = userFullName || guestFullName || null
    const finalUserPhone = userPhone || guestPhone || null

    const paymentReference = {
      reference,
      userId: finalUserId, // Use email as ID for guests if no userId
      userEmail: finalUserEmail,
      userFullName: finalUserFullName,
      userPhone: finalUserPhone || null,
      eventId,
      eventCreatorId,
      eventName: eventName || "",
      eventVenue: eventVenue || "",
      eventType: eventType || "",
      eventDate: eventDate || "",
      eventEndDate: eventEndDate || "",
      eventStart: eventStart || "",
      eventEnd: eventEnd || "",
      stopDate: stopDate || "",
      bookerName: bookerName || "",
      bookerEmail: bookerEmail || "",

      // Canonical ticket info — ticket.js reads ticketTypes to expand into seats
      ticketTypes: normalisedTicketTypes,
      ticketType: primaryTicketType,          // convenience / backwards compat
      ticketPrice,       // subtotal after discount, before fee (also what's paid out/refunded)
      totalAmount,        // grand total inc. fee/addons, after discount — all server-recomputed
      transactionFee,     // Spotix's fee amount — always this, regardless of who paid for it
      // The exact rates applied at purchase time, frozen on the reference so
      // a later admin change to this event's fee config can never retroactively
      // change what a past (or still-pending/resumed) purchase is shown to owe —
      // see buildRecoveredCheckout() in the checkout recovery flow.
      appliedFeeRates: feeRates,
      // Frozen at purchase time — see where feeBurden is resolved above.
      // Read by spotix-backend's admin-sales step to decide whether
      // transactionFee/paystackFee/organizer-covered addons are deducted
      // from the organizer's payout for this sale. buyerBearsBurden kept
      // in sync for any older read path that hasn't migrated to feeBurden.
      feeBurden,
      buyerBearsBurden: !feeBurden.coversSpotixFee,
      // Paystack's real fee for this transaction and which side of the
      // ledger it landed on — see computeOrderPricing's doc comment.
      paystackFee: orderPricing.paystackFeeTotal,
      paystackFeeChargedToBuyer: orderPricing.paystackFeeChargedToBuyer,
      organizerPaystackFeeCost: orderPricing.organizerPaystackFeeCost,
      // Addons active at purchase time, frozen so a later admin edit/
      // deactivation never rewrites what this sale already charged.
      appliedAddons: activeAddons,
      addonFeeTotal: orderPricing.addonFeeTotal,               // charged to buyer
      organizerAddonCostTotal: orderPricing.organizerAddonCostTotal, // deducted from payout
      totalTicketCount,

      vendor: "paystack",
      status: "pending",
      paymentCreationDate: new Date().toISOString(),
      paymentCreationTimestamp: timestamp,

      // Discount / referral — strip any whitespace defensively (referral names
      // are never allowed to contain spaces), in case the client-stored value
      // was tampered with before this request was sent.
      discountCode: discountCode || null,
      discountData: discountData || null,
      discountAmount,
      referralCode: referralCode ? String(referralCode).replace(/\s+/g, "") : null,
      referralName: referralData?.code
        ? String(referralData.code).replace(/\s+/g, "")
        : referralCode
        ? String(referralCode).replace(/\s+/g, "")
        : null,

      // Inert until the backend's ticket-generation pipeline delivers it
      // post-payment. null when the event has no survey / buyer skipped it.
      surveyResponses:
        surveyResponses && typeof surveyResponses === "object" && Object.keys(surveyResponses).length > 0
          ? surveyResponses
          : null,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const referenceDocRef = adminDb.collection("Reference").doc(reference)
    await referenceDocRef.set(paymentReference)

    console.log(`[create-pay-ref] Reference stored successfully: ${reference}`)

    return NextResponse.json(
      {
        success: true,
        reference,
        message: "Payment reference created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[create-pay-ref] Unhandled error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
