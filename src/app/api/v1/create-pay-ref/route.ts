import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { auth } from "firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const {
      eventId,
      eventCreatorId,
      ticketPrice,
      ticketType,
      totalAmount,
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
    } = body

    // Verify authentication - but make it optional for guests
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
        console.log("[v0] Token verification failed, allowing guest checkout")
      }
    }

    // If not authenticated, require guest email
    if (!userId && !guestEmail) {
      return NextResponse.json(
        { error: "Either authentication or guest email is required" },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!eventId || !eventCreatorId || ticketPrice === undefined || !ticketType || totalAmount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Generate unique reference
    const timestamp = Date.now()
    const reference = `SPTX-REF-${timestamp}`

    // Prepare metadata for Firestore
    const paymentReference = {
      reference,
      userId: userId || null,
      userEmail: userEmail || guestEmail || null,
      eventId,
      eventCreatorId,
      eventName: eventName || "",
      eventVenue: eventVenue || "",
      eventDate: eventDate || "",
      eventEndDate: eventEndDate || "",
      eventStart: eventStart || "",
      eventEnd: eventEnd || "",
      ticketPrice: Number(ticketPrice),
      ticketType,
      totalAmount: Number(totalAmount),
      vendor: "paystack",
      status: "pending",
      paymentCreationDate: new Date().toISOString(),
      paymentCreationTimestamp: timestamp,
      
      // Guest information (if not authenticated)
      ...(guestEmail && {
        guestEmail,
        guestFullName: guestFullName || null,
        guestPhone: guestPhone || null,
      }),
      
      // Optional fields
      discountCode: discountCode || null,
      discountData: discountData || null,
      referralCode: referralCode || null,
      referralName: referralData?.code || referralCode || null,
      
      // Metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Store in Firestore Reference collection
    const referenceDocRef = adminDb.collection("Reference").doc(reference)
    await referenceDocRef.set(paymentReference)

    console.log(`Payment reference created: ${reference}`)

    return NextResponse.json(
      {
        success: true,
        reference,
        message: "Payment reference created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating payment reference:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
