/**
 * POST /api/v1/home/mark-past
 * Body: { eventId: string }
 * Called by the home page client when it detects an "upcoming" event whose
 * date has already passed. Adds the event to the recentPastEvents collection
 * for tracking (does not modify the source events document).
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json()
    if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 })

    await adminDb.collection("recentPastEvents").doc(eventId).set(
      { eventId, markedAt: new Date().toISOString() },
      { merge: true }
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
