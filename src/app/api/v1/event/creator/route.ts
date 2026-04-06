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

    // Fetch event details to get the organizer ID
    // Path: events/{eventId}
    const eventDocRef = adminDb.collection("events").doc(eventId)
    const eventDoc = await eventDocRef.get()

    // Check if event exists
    if (!eventDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Event not found",
        },
        { status: 404 }
      )
    }

    const eventData = eventDoc.data()
    const organizerId = eventData?.organizerId

    // Validate that organizerId exists
    if (!organizerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Event organizer information missing",
        },
        { status: 400 }
      )
    }

    // Fetch organizer/creator details from Firebase
    // Path: users/{organizerId}
    const userDocRef = adminDb.collection("users").doc(organizerId)
    const userDoc = await userDocRef.get()

    // Check if user exists
    if (!userDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: "Creator not found",
        },
        { status: 404 }
      )
    }

    // Get user data
    const userData = userDoc.data()

    // Transform the data to match the expected structure
    const bookerDetails = {
      username: userData?.username || userData?.displayName || "Unknown User",
      email: userData?.email || "",
      phone: userData?.phone || userData?.phoneNumber || "",
      isVerified: userData?.isVerified || false,
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        data: bookerDetails,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    )
  } catch (error) {
    console.error("Error fetching creator details:", error)
    
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
