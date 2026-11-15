/**
 * GET /api/v1/home/calendar?month=2026-11
 *
 * Events whose `eventDate` falls inside ONE calendar month — used by the
 * home page's Calendar view.
 *
 * Cost controls:
 *  - Firestore range query on the month + `.limit(50)`  → at most 50 reads on a miss.
 *  - Redis cache per month (5 min, single-flight)       → one read per month per
 *    window no matter how many visitors, not one per request.
 *  - Per-IP rate limit (30 / min, Redis)                → abuse protection.
 *  - Month must be within ±24 months of today           → callers can't mint
 *    unlimited cache keys / cold Firestore queries.
 *  - CDN cache headers                                  → repeat hits never reach this code.
 *
 * Assumes `eventDate` is stored as "YYYY-MM-DD" (an ISO timestamp also works,
 * since it sorts lexicographically inside the same range).
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { checkRateLimit, getOrSetSingleFlight } from "@/app/lib/redis"
import { getRequestIp, hashIp } from "@/app/lib/request-ip"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_EVENTS = 50
const RATE_LIMIT_PER_MIN = 30
const CACHE_TTL_SECONDS = 300
const MONTH_RANGE = 24 // months either side of today

interface CalendarEvent {
  eventId: string
  eventName: string
  venue: string
  eventType: string
  eventStartDate: string
  eventStart?: string
  freeOrPaid: boolean // historical naming: true = PAID, false = FREE
  eventImage: string
}

interface MonthPayload {
  month: string
  events: CalendarEvent[]
  /** True when the month has more than MAX_EVENTS events and the list was cut off. */
  truncated: boolean
}

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/

async function loadMonth(year: number, month: number): Promise<MonthPayload> {
  const mm = String(month).padStart(2, "0")
  const start = `${year}-${mm}-01`
  const nextY = month === 12 ? year + 1 : year
  const nextM = month === 12 ? 1 : month + 1
  const end = `${nextY}-${String(nextM).padStart(2, "0")}-01`

  const snap = await adminDb
    .collection("events")
    .where("eventDate", ">=", start)
    .where("eventDate", "<", end)
    .orderBy("eventDate", "asc")
    .select("eventName", "eventVenue", "eventType", "eventDate", "eventStart", "isFree", "eventImage", "status", "suspended", "eventGroup")
    .limit(MAX_EVENTS)
    .get()

  const events: CalendarEvent[] = []
  snap.forEach((doc) => {
    const d = doc.data()
    // Same visibility rules as /api/v1/home.
    if (d.eventGroup === true) return
    const status = d.status ?? "active"
    if (status === "inactive" || status === "cancelled") return
    if (d.suspended === true) return

    events.push({
      eventId: doc.id,
      eventName: d.eventName ?? "",
      venue: d.eventVenue ?? "",
      eventType: d.eventType ?? "",
      eventStartDate: d.eventDate ?? "",
      eventStart: d.eventStart ?? "",
      freeOrPaid: d.isFree === false,
      eventImage: d.eventImage ?? "",
    })
  })

  return { month: `${year}-${mm}`, events, truncated: snap.size >= MAX_EVENTS }
}

export async function GET(request: NextRequest) {
  // 1. Rate limit (per hashed IP). Fails open if Redis is down.
  const ipKey = hashIp(getRequestIp(request))
  const { allowed } = await checkRateLimit(`rl:home-calendar:${ipKey}`, RATE_LIMIT_PER_MIN)
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } }
    )
  }

  // 2. Validate the month.
  const param = new URL(request.url).searchParams.get("month")?.trim() ?? ""
  const match = MONTH_RE.exec(param)
  if (!match) {
    return NextResponse.json({ success: false, error: "month must look like YYYY-MM" }, { status: 400 })
  }
  const year = Number(match[1])
  const month = Number(match[2])

  const now = new Date()
  const diff = (year - now.getFullYear()) * 12 + (month - 1 - now.getMonth())
  if (Math.abs(diff) > MONTH_RANGE) {
    return NextResponse.json({ success: false, error: "month is out of range" }, { status: 400 })
  }

  try {
    // 3. Cached, single-flight read: only one request per month hits Firestore per TTL.
    const data = await getOrSetSingleFlight<MonthPayload>(`home:calendar:${param}`, CACHE_TTL_SECONDS, () =>
      loadMonth(year, month)
    )
    if (!data) throw new Error("empty result")

    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    )
  } catch (error) {
    console.error("[/api/v1/home/calendar] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch calendar events" }, { status: 500 })
  }
}
