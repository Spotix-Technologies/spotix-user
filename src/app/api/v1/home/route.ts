import { NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export const revalidate = 60

interface HomeEvent {
  eventId: string
  eventName: string
  venue: string
  eventType: string
  eventStartDate: string
  freeOrPaid: boolean
  eventImage: string
}

interface EventCollection {
  collectionId: string
  collectionName: string
  creatorId: string
  eventImage: string
}

interface CategorizedEvents {
  today: HomeEvent[]
  upcoming: HomeEvent[]
  past: HomeEvent[]
}

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0]
}

function categorizeEvents(events: HomeEvent[]): CategorizedEvents {
  const now = new Date()
  const todayStr = getTodayDateString()

  const today: HomeEvent[] = []
  const upcoming: HomeEvent[] = []
  const past: HomeEvent[] = []

  for (const event of events) {
    if (!event.eventStartDate) continue

    const eventDate = new Date(event.eventStartDate)
    const eventDateStr = eventDate.toISOString().split("T")[0]

    if (eventDateStr === todayStr) {
      today.push(event)
    } else if (eventDate >= now) {
      upcoming.push(event)
    } else {
      past.push(event)
    }
  }

  today.sort((a, b) => new Date(a.eventStartDate).getTime() - new Date(b.eventStartDate).getTime())
  upcoming.sort((a, b) => new Date(a.eventStartDate).getTime() - new Date(b.eventStartDate).getTime())
  past.sort((a, b) => new Date(b.eventStartDate).getTime() - new Date(a.eventStartDate).getTime())

  return { today, upcoming, past }
}

export async function GET() {
  try {
    // Only fetch the fields we actually need
    const eventsSnapshot = await adminDb
      .collection("events")
      .select("eventName", "eventVenue", "eventType", "eventDate", "isFree", "eventImage", "status", "suspended", "eventGroup")
      .limit(15)
      .get()

    console.log(`[home] Total docs scanned: ${eventsSnapshot.size}`)

    const events: HomeEvent[] = []

    eventsSnapshot.forEach((doc) => {
      const data = doc.data()

      if (data.eventGroup === true) {
        console.log(`[home] Doc ${doc.id} — SKIPPED (eventGroup)`)
        return
      }

      const status = data.status ?? "active"
      if (status === "inactive" || status === "cancelled") {
        console.log(`[home] Doc ${doc.id} — SKIPPED (status: ${status})`)
        return
      }

      if (data.suspended === true) {
        console.log(`[home] Doc ${doc.id} — SKIPPED (suspended)`)
        return
      }

      console.log(`[home] Doc ${doc.id} — INCLUDED as "${data.eventName}" | date: "${data.eventDate}"`)

      events.push({
        eventId: doc.id,
        eventName: data.eventName ?? "",
        venue: data.eventVenue ?? "",
        eventType: data.eventType ?? "",
        eventStartDate: data.eventDate ?? "",
        freeOrPaid: data.isFree === false,
        eventImage: data.eventImage ?? "",
      })
    })

    console.log(`[home] Events after filtering: ${events.length}`)

    const categorized = categorizeEvents(events)

    console.log(`[home] today: ${categorized.today.length} | upcoming: ${categorized.upcoming.length} | past: ${categorized.past.length}`)

    // Only fetch the fields we need from collections
    const collectionsSnapshot = await adminDb
      .collection("EventCollections")
      .select("collectionName", "creatorId", "eventImage", "status", "suspended")
      .limit(15)
      .get()

    console.log(`[home] EventCollections docs scanned: ${collectionsSnapshot.size}`)

    const collections: EventCollection[] = []

    collectionsSnapshot.forEach((doc) => {
      const data = doc.data()

      if (data.suspended === true) return
      if (data.status === "inactive") return

      collections.push({
        collectionId: doc.id,
        collectionName: data.collectionName ?? "",
        creatorId: data.creatorId ?? "",
        eventImage: data.eventImage ?? "",
      })
    })

    console.log(`[home] Collections after filtering: ${collections.length}`)

    return NextResponse.json(
      {
        success: true,
        data: {
          events: categorized,
          collections,
        },
        _dev: "spotix-user-v1",
      },
      {
        headers: {
          "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
        },
      }
    )
  } catch (error) {
    console.error("[/api/v1/home] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch home data",
        _dev: "spotix-user-v1",
      },
      { status: 500 }
    )
  }
}