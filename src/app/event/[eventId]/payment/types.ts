// app/event/[eventId]/payment/types.ts
//
// Shared shapes for the event checkout page and everything under its
// lib/ and hooks/ folders. Kept separate from the components so lib
// files (which shouldn't import React) can depend on them too.

export interface CartItem {
  ticketType: string
  quantity: number
  price: number
  vat?: number
}

export interface PaymentData {
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  eventCreatorId: string
  organizerId?: string
  eventVenue?: string
  eventType?: string
  eventDate?: string
  eventEndDate?: string
  eventStart?: string
  eventEnd?: string
  stopDate?: string
  bookerName?: string
  bookerEmail?: string
  /** Snapshot of the event's Burden of Fee setting at the moment the buyer
   *  clicked "Buy" — used to compute the fee breakdown shown at checkout.
   *  Not authoritative: create-pay-ref re-fetches the live event doc and
   *  freezes its own snapshot on the Reference regardless of this. */
  feeBurden?: import("@/utils/priceUtility").FeeBurden
  /** Same idea — active addons at the moment of clicking "Buy". */
  addons?: import("@/utils/priceUtility").AddonInput[]
}

export interface ReferralData {
  code: string
}

export interface ReferralCodeOption {
  code: string
}

export interface UserData {
  fullName?: string
  username?: string
  email: string
  phoneNumber?: string
}

export interface GuestInfo {
  guestFullName: string
  guestEmail: string
  guestPhone: string
}

export interface OrganizerInfo {
  organizerName: string
  organizerEmail: string
  organizerId: string
}
