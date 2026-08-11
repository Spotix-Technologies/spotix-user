import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { auth } from "firebase-admin"
import { buildTicketReference } from "@/app/lib/reference-id"

/**
 * POST /api/v1/ref/free
 *
 * Creates a payment reference for free events (totalAmount === 0).
 * Identical to /api/v1/create-pay-ref except:
 *  - All monetary fields are forced to 0
 *  - status is set to "successful" immediately (no payment gateway needed)
 *  - vendor is still "paystack" for schema consistency
 */
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
      bookerName,
      bookerEmail,
      stopDate,
      eventType,
      userFullName,
      userEmail: bodyUserEmail,
      userPhone,
      // See create-pay-ref/route.ts — same inert pass-through, delivered
      // post-"payment" by v1/lib/ticket/survey-delivery.js. Free events are
      // marked status: "successful" immediately below, so delivery happens
      // on the very next generateTickets() call — but still only from the
      // backend, never from here.
      surveyResponses,
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
      } catch (error) {
        // Token verification failed — allow guest checkout
      }
    }

    const finalUserEmail = userEmail || bodyUserEmail || guestEmail || null
    const finalUserId = userId || (finalUserEmail ? finalUserEmail : null)

    if (!finalUserId && !finalUserEmail) {
      return NextResponse.json(
        { error: "Either authentication or user email is required" },
        { status: 400 }
      )
    }

    // ── Normalise ticketTypes ──────────────────────────────────────────────────
    let normalisedTicketTypes: { type: string; quantity: number; price: number }[] = []

    if (ticketTypes && Array.isArray(ticketTypes) && ticketTypes.length > 0) {
      normalisedTicketTypes = ticketTypes.map((item: any) => ({
        type: item.type || item.ticketType || "",
        quantity: Number(item.quantity) || 1,
        price: 0, // Free — always 0
      }))
    } else if (ticketType) {
      normalisedTicketTypes = [{ type: ticketType, quantity: 1, price: 0 }]
    }

    if (normalisedTicketTypes.length === 0) {
      console.error("[ref/free] No valid ticket type info found in request")
      return NextResponse.json(
        { error: "Missing required fields: ticketTypes array (or ticketType) is required" },
        { status: 400 }
      )
    }

    const primaryTicketType = normalisedTicketTypes[0].type
    const totalTicketCount = normalisedTicketTypes.reduce((sum, item) => sum + item.quantity, 0)

    console.log("[ref/free] Normalised ticketTypes:", JSON.stringify(normalisedTicketTypes))
    console.log(`[ref/free] primaryTicketType: ${primaryTicketType}, totalTicketCount: ${totalTicketCount}`)

    // ── Validate required fields ───────────────────────────────────────────────
    if (!eventId || !eventCreatorId) {
      console.error("[ref/free] Missing required fields", { eventId, eventCreatorId })
      return NextResponse.json(
        { error: "Missing required fields: eventId, eventCreatorId" },
        { status: 400 }
      )
    }

    // ── Generate reference ────────────────────────────────────────────────────
    // 2 random letters appended after the timestamp — see
    // src/app/lib/reference-id.ts for why (same-millisecond collisions).
    const timestamp = Date.now()
    const reference = buildTicketReference(timestamp)
    console.log(`[ref/free] Generated reference: ${reference}`)

    // ── Build Firestore document ───────────────────────────────────────────────
    const finalUserFullName = userFullName || guestFullName || null
    const finalUserPhone = userPhone || guestPhone || null

    const paymentReference = {
      reference,
      userId: finalUserId,
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

      // Canonical ticket info
      ticketTypes: normalisedTicketTypes,
      ticketType: primaryTicketType,
      ticketPrice: 0,
      totalAmount: 0,
      transactionFee: 0,
      totalTicketCount,

      vendor: "paystack",
      // Free events are pre-approved — no gateway confirmation needed
      status: "successful",
      paymentCreationDate: new Date().toISOString(),
      paymentCreationTimestamp: timestamp,

      // Discount / referral — strip any whitespace defensively (referral names
      // are never allowed to contain spaces), in case the client-stored value
      // was tampered with before this request was sent.
      discountCode: discountCode || null,
      discountData: discountData || null,
      referralCode: referralCode ? String(referralCode).replace(/\s+/g, "") : null,
      referralName: referralData?.code
        ? String(referralData.code).replace(/\s+/g, "")
        : referralCode
        ? String(referralCode).replace(/\s+/g, "")
        : null,

      surveyResponses:
        surveyResponses && typeof surveyResponses === "object" && Object.keys(surveyResponses).length > 0
          ? surveyResponses
          : null,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const referenceDocRef = adminDb.collection("Reference").doc(reference)
    await referenceDocRef.set(paymentReference)

    console.log(`[ref/free] Reference stored successfully: ${reference}`)

    return NextResponse.json(
      {
        success: true,
        reference,
        message: "Free event reference created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[ref/free] Unhandled error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
