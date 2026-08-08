import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { auth } from "firebase-admin"
import { buildTicketReference } from "@/app/lib/reference-id"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      eventId,
      eventCreatorId,
      ticketPrice,
      ticketType,       
      ticketTypes,      
      totalAmount,
      transactionFee,   
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
    } = body

    // console.log("[create-pay-ref] Incoming body:", JSON.stringify({
    //   eventId,
    //   eventCreatorId,
    //   ticketPrice,
    //   ticketType,
    //   ticketTypes,
    //   totalAmount,
    //   discountCode,
    //   referralCode,
    //   userEmail: bodyUserEmail || guestEmail || null,
    // }, null, 2))

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

    // ── Normalise ticketTypes ──────────────────────────────────────────────────
    // ticketTypes is the canonical field: [{ type, quantity, price }]
    // If only the legacy ticketType string was sent, promote it to the array shape.
    let normalisedTicketTypes: { type: string; quantity: number; price: number }[] = []

    if (ticketTypes && Array.isArray(ticketTypes) && ticketTypes.length > 0) {
      normalisedTicketTypes = ticketTypes.map((item: any) => ({
        type: item.type || item.ticketType || "",
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
      }))
    } else if (ticketType) {
      // Legacy fallback
      normalisedTicketTypes = [{ type: ticketType, quantity: 1, price: Number(ticketPrice) || 0 }]
    }

    if (normalisedTicketTypes.length === 0) {
      console.error("[create-pay-ref] No valid ticket type info found in request")
      return NextResponse.json(
        { error: "Missing required fields: ticketTypes array (or ticketType) is required" },
        { status: 400 }
      )
    }

    // Derive the primary ticketType string from the first item in the array
    // (used for backwards-compat fields on the reference doc)
    const primaryTicketType = normalisedTicketTypes[0].type

    // Total ticket count across all types
    const totalTicketCount = normalisedTicketTypes.reduce((sum, item) => sum + item.quantity, 0)

    console.log("[create-pay-ref] Normalised ticketTypes:", JSON.stringify(normalisedTicketTypes))
    console.log(`[create-pay-ref] primaryTicketType: ${primaryTicketType}, totalTicketCount: ${totalTicketCount}`)

    // ── Validate remaining required fields ────────────────────────────────────
    if (!eventId || !eventCreatorId || ticketPrice === undefined || totalAmount === undefined) {
      console.error("[create-pay-ref] Missing required fields", { eventId, eventCreatorId, ticketPrice, totalAmount })
      return NextResponse.json(
        { error: "Missing required fields: eventId, eventCreatorId, ticketPrice, totalAmount" },
        { status: 400 }
      )
    }

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
      ticketPrice: Number(ticketPrice),       // subtotal before VAT (used for display)
      totalAmount: Number(totalAmount),       // grand total inc. VAT after discount
      transactionFee: Number(transactionFee) || 0, // VAT/fee sent from orderSummary
      totalTicketCount,

      vendor: "paystack",
      status: "pending",
      paymentCreationDate: new Date().toISOString(),
      paymentCreationTimestamp: timestamp,

      // Discount / referral
      discountCode: discountCode || null,
      discountData: discountData || null,
      referralCode: referralCode || null,
      referralName: referralData?.code || referralCode || null,

      // Inert until the backend's ticket-generation pipeline delivers it
      // post-payment. null when the event has no survey / buyer skipped it.
      surveyResponses:
        surveyResponses && typeof surveyResponses === "object" && Object.keys(surveyResponses).length > 0
          ? surveyResponses
          : null,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // console.log("[create-pay-ref] Writing reference doc:", JSON.stringify({
    //   reference,
    //   ticketTypes: normalisedTicketTypes,
    //   totalAmount: paymentReference.totalAmount,
    //   totalTicketCount,
    //   userId: finalUserId,
    //   userEmail: finalUserEmail,
    //   userFullName: finalUserFullName,
    // }, null, 2))

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
