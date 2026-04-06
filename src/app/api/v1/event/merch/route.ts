import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get("eventId")

    // Validate required parameter
    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: eventId is required",
        },
        { status: 400 }
      )
    }

    // Step 1: Fetch listings references from events/{eventId}/listings
    const listingsCollectionRef = adminDb
      .collection("events")
      .doc(eventId)
      .collection("listings")

    const listingsSnapshot = await listingsCollectionRef.get()

    // Check if any listings exist
    if (listingsSnapshot.empty) {
      return NextResponse.json(
        {
          success: true,
          data: [],
        },
        { status: 200 }
      )
    }

    // Step 2: Fetch full product data from listing/{userId}/products/{listingId}
    const merchData = []

    for (const listingDoc of listingsSnapshot.docs) {
      const listingRef = listingDoc.data()
      const listingId = listingRef.listingId
      const listingOwnerId = listingRef.userId

      if (!listingId || !listingOwnerId) {
        continue
      }

      // Fetch full listing data
      const productDocRef = adminDb
        .collection("listing")
        .doc(listingOwnerId)
        .collection("products")
        .doc(listingId)

      const productDoc = await productDocRef.get()

      if (productDoc.exists) {
        const productData = productDoc.data()
        merchData.push({
          id: listingId,
          productName: productData?.productName || "",
          description: productData?.description || "",
          price: productData?.price || 0,
          images: productData?.images || [],
        })
      }
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: merchData,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching event merchandise:", error)
    
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
