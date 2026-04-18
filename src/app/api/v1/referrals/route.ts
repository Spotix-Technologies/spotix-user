import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get("eventId")

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 })
  }

  try {
    const referralsRef = adminDb.collection("events").doc(eventId).collection("referrals")
    const snapshot = await referralsRef.listDocuments()

    // Each document reference's .id is a referral code name
    const referrals = snapshot.map((docRef) => ({ code: docRef.id }))

    return NextResponse.json({ referrals })
  } catch (error) {
    console.error("[referrals] Error listing referral subcollections:", error)
    return NextResponse.json({ error: "Failed to fetch referral codes" }, { status: 500 })
  }
}