// api/v1/survey/response/route.ts

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, eventId, responses, attendeeInfo } = body

    // eventId is required; userId is optional for guests
    if (!eventId) {
      return NextResponse.json({ error: "Missing required field: eventId" }, { status: 400 })
    }

    if (!responses || typeof responses !== "object") {
      return NextResponse.json({ error: "Responses must be an object" }, { status: 400 })
    }

    // Flat structure: events/{eventId}/responses
    const responsesRef = adminDb
      .collection("events")
      .doc(eventId)
      .collection("responses")

    const responseData = {
      responses,
      attendeeInfo: attendeeInfo || {},
      // Store userId when available; null for guests
      userId: userId || null,
      isGuest: attendeeInfo?.isGuest ?? !userId,
      submittedAt: new Date().toISOString(),
      timestamp: new Date(),
    }

    const docRef = await responsesRef.add(responseData)

    return NextResponse.json({
      success: true,
      message: "Response saved successfully",
      responseId: docRef.id,
    })
  } catch (error) {
    console.error("Error saving response:", error)
    return NextResponse.json({ error: "Failed to save response" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")

    if (!eventId) {
      return NextResponse.json({ error: "Missing required parameter: eventId" }, { status: 400 })
    }

    // Flat structure: events/{eventId}/responses
    const responsesRef = adminDb
      .collection("events")
      .doc(eventId)
      .collection("responses")

    const snapshot = await responsesRef.orderBy("timestamp", "desc").get()
    const responses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    // Get questions for reference — also flat: events/{eventId}/questions
    const questionsRef = adminDb
      .collection("events")
      .doc(eventId)
      .collection("questions")

    const questionsSnapshot = await questionsRef.orderBy("order").get()
    const questions = questionsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

    return NextResponse.json({
      success: true,
      responses,
      questions,
      totalResponses: responses.length,
    })
  } catch (error) {
    console.error("Error fetching responses:", error)
    return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 })
  }
}