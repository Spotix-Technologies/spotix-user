/**
 * GET /api/v1/discover?state=Lagos&genre=Music
 * Returns active, future discover events for a given Nigerian state.
 * Rate limited: 30 requests / minute per IP.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// ── In-process rate limiter ───────────────────────────────────────────────────
const rl = new Map<string, { count: number; resetAt: number }>()
const RL_MAX = 30
const RL_WINDOW = 60_000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rl.get(ip)
  if (!entry || now > entry.resetAt) {
    rl.set(ip, { count: 1, resetAt: now + RL_WINDOW })
    return true
  }
  if (entry.count >= RL_MAX) return false
  entry.count++
  return true
}

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

export async function GET(request: NextRequest) {
  const ip = getIP(request)
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      { status: 429, headers: { "Retry-After": "60" } }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get("state")?.trim()
    const genre = searchParams.get("genre")?.trim()

    if (!state) {
      return NextResponse.json({ error: "state is required" }, { status: 400 })
    }

    const now = new Date().toISOString()

    let query = adminDb
      .collection("discover")
      .doc(state)
      .collection("events")
      .where("status", "==", "active")
      .where("eventStart", ">", now) // future events only
      .orderBy("eventStart", "asc")
      .limit(40)

    const snap = await query.get()

    let events = snap.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
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
      }
    })

    if (genre && genre !== "All") {
      events = events.filter((e) => e.genre === genre)
    }

    return NextResponse.json(
      { success: true, events, total: events.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    )
  } catch (error) {
    console.error("[/api/v1/discover] Error:", error)
    return NextResponse.json({ error: "Failed to fetch discover events" }, { status: 500 })
  }
}
