import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { verifyAccessToken } from "@/app/lib/auth-tokens"

const AUDIENCE = "spotix-user"

// Shared auth helper
async function authenticate(request: NextRequest) {
  let token = ""
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7)
  } else {
    token = request.cookies.get("spotix_u_at")?.value || ""
  }
  if (!token) return null
  try {
    return await verifyAccessToken(token, AUDIENCE)
  } catch {
    return null
  }
}

// ─── GET: check if embedding exists ───────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    const tokenData = await authenticate(request)
    if (!tokenData?.email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const ticketRef = adminDb.collection("tickets").doc(ticketId)
    const ticketDoc = await ticketRef.get()

    if (!ticketDoc.exists) {
      return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 })
    }

    const ticketData = ticketDoc.data()!

    if (ticketData.email !== tokenData.email) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const hasEmbedding = ticketData.hasEmbedding === true

    return NextResponse.json({
      success: true,
      hasEmbedding,
      updatedAt: ticketData.faceEmbeddingUpdatedAt ?? null,
    })
  } catch (error) {
    console.error("[embedding/GET] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

// ─── POST: save embedding ──────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    const tokenData = await authenticate(request)
    if (!tokenData?.email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const userEmail = tokenData.email
    const body = await request.json()
    const { embedding, eventId } = body

    if (!embedding || !Array.isArray(embedding) || embedding.length !== 128) {
      return NextResponse.json(
        { success: false, message: "Invalid embedding data. Must be an array of 128 numbers." },
        { status: 400 }
      )
    }

    if (!eventId) {
      return NextResponse.json({ success: false, message: "Event ID is required" }, { status: 400 })
    }

    const ticketRef = adminDb.collection("tickets").doc(ticketId)
    const eventRef = adminDb.collection("events").doc(eventId)

    // Pre-flight reads (outside the batch — batches are write-only)
    const [ticketDoc, eventDoc] = await Promise.all([ticketRef.get(), eventRef.get()])

    if (!ticketDoc.exists) {
      return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 })
    }
    if (ticketDoc.data()!.email !== userEmail) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }
    if (!eventDoc.exists) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 })
    }

    const attendeeRef = adminDb
      .collection("events")
      .doc(eventId)
      .collection("attendees")
      .doc(ticketId)

    const now = FieldValue.serverTimestamp()

    // Atomic batch: both writes succeed or both fail
    const batch = adminDb.batch()

    batch.set(
      ticketRef,
      {
        faceEmbedding: embedding,
        faceEmbeddingUpdatedAt: now,
        hasEmbedding: true,
      },
      { merge: true }
    )

    batch.set(
      attendeeRef,
      {
        faceEmbedding: embedding,
        email: userEmail,
        hasEmbedding: true,
        updatedAt: now,
      },
      { merge: true }
    )

    await batch.commit()

    return NextResponse.json({
      success: true,
      message: "Face embedding saved successfully",
      data: { ticketId, eventId, embeddingPoints: embedding.length },
    })
  } catch (error) {
    console.error("[embedding/POST] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

// ─── DELETE: remove embedding ──────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params

    const tokenData = await authenticate(request)
    if (!tokenData?.email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const userEmail = tokenData.email
    const body = await request.json()
    const { eventId } = body

    if (!eventId) {
      return NextResponse.json({ success: false, message: "Event ID is required" }, { status: 400 })
    }

    const ticketRef = adminDb.collection("tickets").doc(ticketId)
    const attendeeRef = adminDb
      .collection("events")
      .doc(eventId)
      .collection("attendees")
      .doc(ticketId)

    // Pre-flight reads
    const [ticketDoc, attendeeDoc] = await Promise.all([ticketRef.get(), attendeeRef.get()])

    if (!ticketDoc.exists) {
      return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 })
    }
    if (ticketDoc.data()!.email !== userEmail) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const now = FieldValue.serverTimestamp()

    // Atomic batch: both deletes succeed or both fail
    const batch = adminDb.batch()

    batch.update(ticketRef, {
      faceEmbedding: FieldValue.delete(),
      faceEmbeddingUpdatedAt: FieldValue.delete(),
      hasEmbedding: false,
    })

    // Only include attendee in the batch if the doc actually exists
    if (attendeeDoc.exists) {
      batch.update(attendeeRef, {
        faceEmbedding: FieldValue.delete(),
        hasEmbedding: false,
        updatedAt: now,
      })
    }

    await batch.commit()

    return NextResponse.json({
      success: true,
      message: "Face embedding deleted successfully",
    })
  } catch (error) {
    console.error("[embedding/DELETE] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}