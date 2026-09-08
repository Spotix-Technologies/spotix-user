import type { Metadata } from "next"
import { getCachedEventDoc } from "@/app/lib/eventCache"
import ShopPaymentClient from "./ShopPaymentClient"
import type { ShopEventInfo } from "../lib/types"

async function fetchEventBasics(eventId: string): Promise<ShopEventInfo | null> {
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
  const event = await fetchEventBasics(eventId)
  const eventName = event?.eventName || "Shop"
  return {
    title: `Checkout - ${eventName} | Spotix`,
    description: `Complete your merchandise order for ${eventName}.`,
  }
}

export default async function ShopPaymentPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const event = await fetchEventBasics(eventId)
  return <ShopPaymentClient eventId={eventId} event={event} />
}
