/**
 * src/app/event/[eventId]/shop/lib/types.ts
 *
 * Shared shapes for the shop route group (listing, details, payment).
 */

export interface ShopMerchItem {
  id: string
  name: string
  /** Buyer-facing price per unit — already fee-adjusted for this event's
   *  Burden of Fee setting, see /api/v1/event/merch and
   *  utils/merchPricing.ts. */
  price: number
  image: string
  description?: string
  stock: number
}

export interface ShopEventInfo {
  eventId: string
  eventName: string
  eventImage: string
  createdBy: string
}
