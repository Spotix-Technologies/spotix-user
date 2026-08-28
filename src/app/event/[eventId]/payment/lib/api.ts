// app/event/[eventId]/payment/lib/api.ts
//
// Every plain data-fetching call the checkout page makes (excluding
// reference creation and payment-status recovery, which get their own
// files — create-payment-reference.ts and payment-status.ts — since
// they're each substantial enough to stand alone).

import { authFetch, getAccessToken } from "@/app/lib/auth-client-user"
import { waitForFirebaseUser } from "./firebase-user"
import type { DiscountData } from "@/app/payment/helpers/discount-utils"
import type { PaymentData, ReferralCodeOption, UserData } from "../types"

export async function fetchUserProfile(): Promise<UserData | null> {
  try {
    // Never read Firestore directly from the client — go through the
    // Admin-SDK-backed /api/v1/user/me route, same as the rest of the app.
    const res = await authFetch("/api/v1/user/me")
    if (!res.ok) return null
    const data = await res.json()
    if (!data.authenticated) return null
    return {
      fullName: data.fullName || data.username || "Valued Customer",
      username: data.username,
      email: data.email || "",
      phoneNumber: data.phoneNumber || "",
    }
  } catch (error) {
    console.error("Error fetching user data:", error)
    return null
  }
}

export async function fetchWalletBalance(): Promise<number> {
  try {
    const firebaseUser = await waitForFirebaseUser()
    const response = await fetch("/api/v1/iwss", {
      headers: {
        Authorization: `Bearer ${(await firebaseUser?.getIdToken()) ?? ""}`,
      },
    })
    if (!response.ok) return 0
    const data = await response.json()
    return data.balance || 0
  } catch (error) {
    console.error("Error fetching wallet data:", error)
    return 0
  }
}

export async function fetchEventDetails(
  creatorId: string,
  eventId: string,
  existingData: PaymentData
): Promise<PaymentData> {
  try {
    const response = await fetch(`/api/v1/event?eventId=${eventId}`)
    if (!response.ok) {
      console.error("Failed to fetch event details")
      return existingData
    }

    const result = await response.json()
    if (!result.success || !result.data) return existingData

    const data = result.data
    return {
      ...existingData,
      eventVenue: data.eventVenue || existingData.eventVenue || "",
      eventType: data.eventType || existingData.eventType || "",
      eventDate: data.eventDate || existingData.eventDate || "",
      eventEndDate: data.eventEndDate || existingData.eventEndDate || "",
      eventStart: data.eventStart || existingData.eventStart || "",
      eventEnd: data.eventEnd || existingData.eventEnd || "",
      stopDate: data.stopDate || existingData.stopDate || "",
      bookerName: data.bookerName || "Event Host",
      bookerEmail: data.bookerEmail || "support@spotix.com.ng",
      organizerId: data.organizerId || existingData.organizerId || "",
    }
  } catch (error) {
    console.error("Error fetching event details:", error)
    return existingData
  }
}

export async function fetchReferralCodes(eventId: string): Promise<{ codes: ReferralCodeOption[]; error?: string }> {
  try {
    const response = await fetch(`/api/v1/referrals?eventId=${eventId}`)
    if (!response.ok) throw new Error("Failed to fetch referral codes")
    const data = await response.json()
    return { codes: data.referrals || [] }
  } catch (error) {
    console.error("Error fetching referral codes:", error)
    return { codes: [], error: "Failed to load referral codes" }
  }
}

export async function validateDiscountCode(params: {
  code: string
  eventId: string | undefined
  ticketTypes: string[]
}): Promise<{ data: DiscountData } | { error: string }> {
  try {
    const response = await fetch("/api/v1/discount", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      },
      body: JSON.stringify({
        code: params.code,
        eventId: params.eventId,
        // Lets the API reject/accept codes scoped to specific ticket types
        // (see discountsTab in the booker app) against what's actually in
        // this buyer's cart.
        ticketTypes: params.ticketTypes,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.message || data.error || "Invalid discount code" }
    }

    return {
      data: {
        id: data.id,
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        maxUses: data.maxUses,
        currentUses: data.currentUses,
        expiryDate: data.expiryDate ?? null,
        applicableTickets: data.applicableTickets ?? null,
      },
    }
  } catch (error) {
    console.error("Error validating discount:", error)
    return { error: "Failed to validate discount code" }
  }
}
