// app/event/[eventId]/payment/lib/create-payment-reference.ts
//
// Builds the request body and POSTs to /api/v1/create-pay-ref (paid) or
// /api/v1/ref/free (free events) — extracted straight out of
// EventPaymentClient so the ~130-line request-shaping logic isn't mixed
// in with component render/effect code.

import type { SessionUser } from "@/app/lib/auth-client-user"
import type { DiscountData } from "@/app/payment/helpers/discount-utils"
import { calculateDiscount } from "@/app/payment/helpers/discount-utils"
import { waitForFirebaseUser } from "./firebase-user"
import { readGuestCheckout } from "./checkout-storage"
import type { CartItem, GuestInfo, OrganizerInfo, PaymentData, ReferralData, UserData } from "../types"

export interface CreateReferenceParams {
  paymentData: PaymentData
  cart: CartItem[]
  discountData: DiscountData | null
  referralData: ReferralData | null
  organizer: OrganizerInfo
  user: SessionUser | null
  userData: UserData | null
  guest: GuestInfo
  surveyResponses: Record<string, any> | null
}

export type CreateReferenceResult = { reference: string } | { error: string }

export async function createPaymentReference(params: CreateReferenceParams): Promise<CreateReferenceResult> {
  const { paymentData, cart, discountData, referralData, organizer, user, userData, guest, surveyResponses } = params

  if (cart.length === 0) return { error: "Your cart is empty." }
  // For guests, userData won't be set from Firestore, but we need guestEmail/guestFullName.
  // For authenticated users, userData must be set.
  if (user && !userData) return { error: "Missing user details." }

  try {
    const isFreeEvent = paymentData.ticketPrice === 0

    const subtotalBeforeDiscount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const totalVat = cart.reduce((sum, item) => sum + (item.vat || 0) * item.quantity, 0)
    const discountAmount = isFreeEvent ? 0 : calculateDiscount(cart, discountData).discountAmount
    const subtotal = subtotalBeforeDiscount - discountAmount
    const totalAmount = subtotal + totalVat

    // Free events use a dedicated route that pre-sets status to "successful"
    const endpoint = isFreeEvent ? "/api/v1/ref/free" : "/api/v1/create-pay-ref"

    const ticketTypes = cart.map((item) => ({
      type: item.ticketType,
      quantity: item.quantity,
      price: item.price,
    }))

    const finalEventCreatorId = organizer.organizerId || paymentData.organizerId || paymentData.eventCreatorId

    const requestBody: any = {
      eventId: paymentData.eventId,
      eventCreatorId: finalEventCreatorId,
      ticketTypes,
      referralCode: referralData?.code || null,
      referralData: referralData || null,
      eventName: paymentData.eventName,
      eventVenue: paymentData.eventVenue || null,
      eventType: paymentData.eventType || null,
      eventDate: paymentData.eventDate || null,
      eventEndDate: paymentData.eventEndDate || null,
      eventStart: paymentData.eventStart || null,
      eventEnd: paymentData.eventEnd || null,
      stopDate: paymentData.stopDate || null,
      bookerName: organizer.organizerName || paymentData.bookerName || null,
      bookerEmail: organizer.organizerEmail || paymentData.bookerEmail || null,
      // Carried on the reference doc, inert, until the backend delivers it
      // post-payment (v1/lib/ticket/survey-delivery.js).
      surveyResponses: surveyResponses || null,
    }

    if (user && userData) {
      requestBody.userFullName = userData.fullName || "Valued Customer"
      requestBody.userEmail = userData.email
      if (userData.phoneNumber) requestBody.userPhone = userData.phoneNumber
    }

    if (!user) {
      let finalGuestEmail = guest.guestEmail
      let finalGuestFullName = guest.guestFullName
      let finalGuestPhone = guest.guestPhone

      if (!finalGuestEmail || !finalGuestFullName) {
        const saved = readGuestCheckout()
        if (saved) {
          finalGuestEmail = finalGuestEmail || saved.guestEmail
          finalGuestFullName = finalGuestFullName || saved.guestFullName
          finalGuestPhone = finalGuestPhone || saved.guestPhone
        }
      }

      requestBody.userEmail = finalGuestEmail
      requestBody.userFullName = finalGuestFullName
      if (finalGuestPhone) requestBody.userPhone = finalGuestPhone
    }

    requestBody.ticketPrice = isFreeEvent ? 0 : subtotal
    requestBody.totalAmount = isFreeEvent ? 0 : totalAmount
    requestBody.transactionFee = isFreeEvent ? 0 : totalVat
    requestBody.discountAmount = isFreeEvent ? 0 : discountAmount
    requestBody.discountCode = isFreeEvent ? null : discountData?.code || null
    requestBody.discountData = isFreeEvent ? null : discountData || null

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (user) {
      const firebaseUser = await waitForFirebaseUser()
      const idToken = await firebaseUser?.getIdToken()
      if (idToken) headers.Authorization = `Bearer ${idToken}`
    }

    const response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { error: errorData.error || "Failed to create reference" }
    }

    const data = await response.json()
    console.log("Reference created:", data.reference)
    return { reference: data.reference }
  } catch (error) {
    console.error("Error creating reference:", error)
    return { error: error instanceof Error ? error.message : "Failed to create reference" }
  }
}
