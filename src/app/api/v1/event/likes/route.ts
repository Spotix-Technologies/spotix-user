import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { verifyAccessToken } from "@/app/lib/auth-tokens"

// User portal access token cookie — must match COOKIE_ACCESS_TOKEN in /api/v1/auth/route.ts
const COOKIE_ACCESS_TOKEN = "spotix_u_at"

/**
 * Extracts and verifies the spotix_u_at cookie.
 * Returns the decoded payload or null if missing / invalid / expired.
 * Never throws — all errors are treated as unauthenticated.
 */
async function getAuthPayload(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value
    if (!token) return null
    return await verifyAccessToken(token, "spotix-user")
  } catch {
    return null
  }
}

/**
 * GET /api/v1/event/likes?eventId=xxx
 *
 * Returns whether the currently authenticated user has liked this event.
 * Unauthenticated requests return { liked: false } — not an error.
 */
export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get("eventId")

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: eventId" },
        { status: 400 }
      )
    }

    const payload = await getAuthPayload(request)
    if (!payload) {
      return NextResponse.json({ success: true, liked: false })
    }

    // Existence of likes/{userId}_{eventId} is the sole source of truth
    const likeDocId = `${payload.uid}_${eventId}`
    const likeDoc = await adminDb.collection("likes").doc(likeDocId).get()

    return NextResponse.json({ success: true, liked: likeDoc.exists })
  } catch (error) {
    console.error("Error checking like status:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/event/likes
 * Body: { eventId: string, action: "like" | "unlike" }
 *
 * Atomically creates/deletes likes/{userId}_{eventId}
 * and increments/decrements events/{eventId}.likeCount via a Firestore batch.
 * Both operations succeed or neither does.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getAuthPayload(request)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { eventId, action } = body as { eventId?: string; action?: string }

    if (!eventId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: eventId and action" },
        { status: 400 }
      )
    }

    if (action !== "like" && action !== "unlike") {
      return NextResponse.json(
        { success: false, error: "action must be 'like' or 'unlike'" },
        { status: 400 }
      )
    }

    const userId = payload.uid
    const likeDocId = `${userId}_${eventId}`
    const likeDocRef = adminDb.collection("likes").doc(likeDocId)
    const eventDocRef = adminDb.collection("events").doc(eventId)

    if (action === "like") {
      // Idempotency — don't double-increment
      const existing = await likeDocRef.get()
      if (existing.exists) {
        return NextResponse.json({ success: true, liked: true, message: "Already liked" })
      }

      const batch = adminDb.batch()
      batch.set(likeDocRef, {
        userId,
        eventId,
        likedAt: FieldValue.serverTimestamp(),
      })
      batch.update(eventDocRef, {
        likeCount: FieldValue.increment(1),
      })
      await batch.commit()

      return NextResponse.json({ success: true, liked: true })
    } else {
      // Idempotency — don't double-decrement
      const existing = await likeDocRef.get()
      if (!existing.exists) {
        return NextResponse.json({ success: true, liked: false, message: "Not liked" })
      }

      const batch = adminDb.batch()
      batch.delete(likeDocRef)
      batch.update(eventDocRef, {
        likeCount: FieldValue.increment(-1),
      })
      await batch.commit()

      return NextResponse.json({ success: true, liked: false })
    }
  } catch (error) {
    console.error("Error updating like:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}