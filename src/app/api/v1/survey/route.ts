// api/v1/survey/route.ts

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")
    const ticketType = searchParams.get("ticketType")

    if (!eventId || !ticketType) {
      return NextResponse.json(
        { error: "Missing required parameters: eventId, ticketType" },
        { status: 400 },
      )
    }

    // Get questions - using flat structure with eventId only
    const questionsCollectionRef = adminDb
      .collection("events")
      .doc(eventId)
      .collection("questions")

    const questionsSnapshot = await questionsCollectionRef.orderBy("order").get()
    
    // If no questions exist, return early
    if (questionsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        hasForm: false,
        questions: [],
        requiresForm: false,
      })
    }

    const questions = questionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    // Get ticket settings
    const settingsRef = adminDb
      .collection("events")
      .doc(eventId)
      .collection("formSettings")
      .doc("ticketSettings")

    const settingsDoc = await settingsRef.get()
    const ticketSettings = settingsDoc.exists ? settingsDoc.data()?.ticketSettings : {}

    // Check if this specific ticket type requires the form
    const requiresForm = ticketSettings[ticketType] === true

    return NextResponse.json({
      success: true,
      hasForm: questions.length > 0,
      requiresForm,
      questions: requiresForm ? questions : [],
    })
  } catch (error) {
    console.error("Error fetching survey:", error)
    return NextResponse.json({ error: "Failed to fetch survey" }, { status: 500 })
  }
}
