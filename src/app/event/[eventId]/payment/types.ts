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
