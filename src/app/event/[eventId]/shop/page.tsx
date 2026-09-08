import type { Metadata } from "next"
import { getCachedEventDoc } from "@/app/lib/eventCache"
import ShopClient from "./ShopClient"
import type { ShopEventInfo } from "./lib/types"

async function fetchShopEvent(eventId: string): Promise<ShopEventInfo | null> {
  const d = await getCachedEventDoc(eventId)
  if (!d) return null
  return {
    eventId: d.id,
    eventName: d?.eventName || "",
    eventImage: d?.eventImage || "",
    createdBy: d?.organizerId || d?.createdBy || "",
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>
}): Promise<Metadata> {
  const { eventId } = await params
  const event = await fetchShopEvent(eventId)
  if (!event) {
    return {
      title: "Shop Not Found - Spotix",
      description: "This event's shop could not be found.",
    }
  }
  return {
    title: `${event.eventName}'s Shop - Spotix`,
    description: `Shop official merchandise for ${event.eventName} on Spotix.`,
  }
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const event = await fetchShopEvent(eventId)
  return <ShopClient eventId={eventId} initialEvent={event} />
}
