/**
 * GET /api/v1/discover/[state]/[id]
 * Returns a single discover event by state + document ID.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  try {
    const { state, id } = await params

    if (!state || !id) {
      return NextResponse.json({ error: "state and id are required" }, { status: 400 })
    }

    const snap = await adminDb
      .collection("discover")
      .doc(state)
      .collection("events")
      .doc(id)
      .get()

    if (!snap.exists) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const d = snap.data()!
    return NextResponse.json(
      {
        success: true,
        event: {
          id: snap.id,
          state: d.state,
          eventName: d.eventName,
          description: d.description,
          host: d.host,
          location: d.location,
          genre: d.genre,
          eventStart: d.eventStart,
          eventEnd: d.eventEnd || null,
          ticketPolicy: d.ticketPolicy,
          isSpotixEvent: d.isSpotixEvent,
          spotixEventId: d.isSpotixEvent ? d.spotixEventId : null,
          ticketLink: !d.isSpotixEvent ? d.ticketLink : null,
          imageUrl: d.imageUrl,
          postedBy: d.postedBy,
          createdAt: d.createdAt,
        },
      },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } }
    )
  } catch (error) {
    console.error("[/api/v1/discover/[state]/[id]] Error:", error)
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 })
  }
}
