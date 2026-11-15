import { collection, getDocs, limit, orderBy, query } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import { FEATURED_LIMIT } from "../constants"
import type { FeaturedEvent } from "../types"

/** SWR key — shared with the landing page so its cache is reused. */
export const FEATURED_KEY = "featuredEvents"

export async function fetchFeaturedEvents(): Promise<FeaturedEvent[]> {
  const snapshot = await getDocs(
    query(collection(db, "featuredEvents"), orderBy("addedAt", "desc"), limit(FEATURED_LIMIT))
  )
  const events: FeaturedEvent[] = []
  snapshot.docs.forEach((doc) => {
    const d = doc.data()
    if (!d.eventId || !d.creatorID) return
    events.push({
      id: doc.id,
      eventName: d.eventName,
      imageURL: d.imageURL,
      eventType: d.eventType,
      venue: d.venue,
      eventStartDate: d.eventStartDate,
      freeOrPaid: d.freeOrPaid,
      creatorID: d.creatorID,
      eventId: d.eventId,
      bookerName: d.bookerName || "Event Organizer",
    })
  })
  return events
}
