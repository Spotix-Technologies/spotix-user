import type { Metadata } from "next"
import { getCachedEventDoc } from "@/app/lib/eventCache"
import { getMerchListingById } from "@/app/lib/merch-listings"
import { computeMerchDisplayPrice } from "@/utils/merchPricing"
import MerchDetailsClient from "./MerchDetailsClient"
import type { ShopEventInfo, ShopMerchItem } from "../lib/types"

interface MerchDetailsData {
  event: ShopEventInfo
  item: ShopMerchItem
  /** Whether Paystack's own (per-unit) fee is owed by the buyer under
   *  THIS LISTING's own fee_burden (Supabase) — item.price above already
   *  bakes in Spotix's own merch fee where applicable; Paystack's is
   *  only known at checkout, so this is just a display hint. */
  buyerOwesPaystackFee: boolean
}

async function fetchShopItem(eventId: string, merchId: string): Promise<MerchDetailsData | null> {
  const [eventDoc, listing] = await Promise.all([
    getCachedEventDoc(eventId),
    getMerchListingById(merchId),
  ])
  // Not found, or a listing the booker has paused from Manage Listings —
  // both treated as a plain "item not found" for a buyer.
  if (!eventDoc || !listing || listing.status !== "active") return null

  // The listing's OWN fee_burden (Supabase) decides what the buyer sees —
  // NOT the event's Firestore Burden-of-Fee setting, which is a
  // ticket-only concept and doesn't apply to merch. See create-merch-ref
  // for the matching checkout-time logic.
  const feeBurden = listing.feeBurden

  return {
    event: {
      eventId: eventDoc.id,
      eventName: eventDoc?.eventName || "",
      eventImage: eventDoc?.eventImage || "",
      createdBy: eventDoc?.organizerId || eventDoc?.createdBy || "",
    },
    item: {
      id: listing.id,
      name: listing.productName,
      description: listing.description,
      price: computeMerchDisplayPrice(listing.price, feeBurden),
      image: listing.images?.[0] ?? "",
      stock: listing.quantity,
    },
    buyerOwesPaystackFee: !feeBurden.coversPaystackFee,
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string; merchId: string }>
}): Promise<Metadata> {
  const { eventId, merchId } = await params
  const data = await fetchShopItem(eventId, merchId)
  if (!data) {
    return { title: "Item Not Found - Spotix", description: "This merchandise item could not be found." }
  }
  return {
    title: `${data.item.name} - ${data.event.eventName} Shop | Spotix`,
    description: data.item.description || `Buy ${data.item.name} from ${data.event.eventName}'s official shop.`,
  }
}

export default async function MerchDetailsPage({
  params,
}: {
  params: Promise<{ eventId: string; merchId: string }>
}) {
  const { eventId, merchId } = await params
  const data = await fetchShopItem(eventId, merchId)
  return <MerchDetailsClient eventId={eventId} data={data} />
}
