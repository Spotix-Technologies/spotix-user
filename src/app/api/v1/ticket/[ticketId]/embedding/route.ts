import { NextRequest, NextResponse } from "next/server"
import { db } from "@/app/lib/firebase"
import { doc, setDoc, getDoc, deleteField, updateDoc, serverTimestamp } from "firebase/firestore"
import { verifyAccessToken, type TokenAudience } from "@/app/lib/auth-tokens"

const AUDIENCE: TokenAudience = "spotix-user"

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

    const ticketRef = doc(db, "tickets", ticketId)
    const ticketDoc = await getDoc(ticketRef)

    if (!ticketDoc.exists()) {
      return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 })
    }

    const ticketData = ticketDoc.data()

    if (ticketData.email !== tokenData.email) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const hasEmbedding = Array.isArray(ticketData.faceEmbedding) && ticketData.faceEmbedding.length === 128

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

    const ticketRef = doc(db, "tickets", ticketId)
    const ticketDoc = await getDoc(ticketRef)

    if (!ticketDoc.exists()) {
      return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 })
    }

    if (ticketDoc.data().email !== userEmail) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    const eventRef = doc(db, "events", eventId)
    const eventDoc = await getDoc(eventRef)
    if (!eventDoc.exists()) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 })
    }

    // Save to events/{eventId}/attendees/{ticketId}
    const attendeeRef = doc(db, "events", eventId, "attendees", ticketId)
    await setDoc(attendeeRef, {
      faceEmbedding: embedding,
      email: userEmail,
      updatedAt: serverTimestamp(),
    }, { merge: true })

    // Save to tickets/{ticketId}
    await setDoc(ticketRef, {
      faceEmbedding: embedding,
      faceEmbeddingUpdatedAt: serverTimestamp(),
    }, { merge: true })

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

    const ticketRef = doc(db, "tickets", ticketId)
    const ticketDoc = await getDoc(ticketRef)

    if (!ticketDoc.exists()) {
      return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 })
    }

    if (ticketDoc.data().email !== userEmail) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 })
    }

    // Delete from tickets/{ticketId}
    await updateDoc(ticketRef, {
      faceEmbedding: deleteField(),
      faceEmbeddingUpdatedAt: deleteField(),
    })

    // Delete from events/{eventId}/attendees/{ticketId}
    const attendeeRef = doc(db, "events", eventId, "attendees", ticketId)
    const attendeeDoc = await getDoc(attendeeRef)
    if (attendeeDoc.exists()) {
      await updateDoc(attendeeRef, {
        faceEmbedding: deleteField(),
        updatedAt: serverTimestamp(),
      })
    }

    return NextResponse.json({
      success: true,
      message: "Face embedding deleted successfully",
    })
  } catch (error) {
    console.error("[embedding/DELETE] Error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}