import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const organizerId = searchParams.get("organizerId")
    const currentEventId = searchParams.get("currentEventId")
    const limitParam = searchParams.get("limit")

    // Validate required parameters
    if (!organizerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: organizerId is required",
        },
        { status: 400 }
      )
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 10

    // Fetch suggested events from Firebase by querying events with matching organizerId
    // Path: events where organizerId = organizerId
    const eventsCollectionRef = adminDb
      .collection("events")
      .where("organizerId", "==", organizerId)
      .orderBy("createdAt", "desc")
      .limit(limit)

    const eventsSnapshot = await eventsCollectionRef.get()

    // Check if any events exist
    if (eventsSnapshot.empty) {
      return NextResponse.json(
        {
          success: true,
          data: [],
        },
        { status: 200 }
      )
    }

    // Fetch organizer info from users collection
    const organizerDocRef = adminDb.collection("users").doc(organizerId)
    const organizerDoc = await organizerDocRef.get()

    const organizerInfo = organizerDoc.exists
      ? {
          username: organizerDoc.data()?.username || organizerDoc.data()?.displayName || "Unknown User",
          avatar: organizerDoc.data()?.avatar || "",
          isVerified: organizerDoc.data()?.isVerified || false,
        }
      : null

    // Transform the events data
    const eventsData = []

    for (const doc of eventsSnapshot.docs) {
      // Skip the current event if currentEventId is provided
      if (currentEventId && doc.id === currentEventId) {
        continue
      }

      const data = doc.data()
      eventsData.push({
        id: doc.id,
        eventName: data?.eventName || "",
        eventImage: data?.eventImage || "",
        eventDate: data?.eventDate || "",
        eventVenue: data?.eventVenue || "",
        organizer: organizerInfo,
      })
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: eventsData,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=180, stale-while-revalidate=360",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching suggested events:", error)
    
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
