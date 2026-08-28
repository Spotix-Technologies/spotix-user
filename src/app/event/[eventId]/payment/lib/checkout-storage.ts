// app/event/[eventId]/payment/lib/checkout-storage.ts
//
// Every localStorage/sessionStorage read or write the checkout page does,
// in one place. Pure functions, SSR-safe (all guard `typeof window`) —
// no React here, so this is trivially reusable from hooks or lib code.

import type { CartItem, GuestInfo, OrganizerInfo, ReferralData } from "../types"
import { STORAGE_KEYS } from "../constants"

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.cart) || "[]")
  } catch (error) {
    console.error("Error parsing cart:", error)
    return []
  }
}

export function readOrganizer(): OrganizerInfo | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(STORAGE_KEYS.organizer)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return {
      organizerName: parsed.bookername || "",
      organizerEmail: parsed.bookeremail || "",
      organizerId: parsed.organizerId || "",
    }
  } catch (error) {
    console.error("Error parsing organizer data:", error)
    return null
  }
}

export function readGuestCheckout(): GuestInfo | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(STORAGE_KEYS.guestCheckout)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return {
      guestFullName: parsed.guestFullName || "",
      guestEmail: parsed.guestEmail || "",
      guestPhone: parsed.guestPhone || "",
    }
  } catch (error) {
    console.error("Error parsing guest data:", error)
    return null
  }
}

export function writeGuestCheckout(info: GuestInfo): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEYS.guestCheckout, JSON.stringify(info))
}

export function readStoredPaymentData(): Record<string, any> | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(STORAGE_KEYS.paymentData)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.error("Error parsing payment data:", error)
    return null
  }
}

export function writeStoredPaymentData(data: unknown): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(STORAGE_KEYS.paymentData, JSON.stringify(data))
}

export function writePaystackPaymentData(data: unknown): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(STORAGE_KEYS.paystackPaymentData, JSON.stringify(data))
}

export function readSelectedReferral(): ReferralData | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(STORAGE_KEYS.selectedReferral)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.error("Error parsing stored referral:", error)
    return null
  }
}

export function writeSelectedReferral(referral: ReferralData): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(STORAGE_KEYS.selectedReferral, JSON.stringify(referral))
}

export function clearSelectedReferral(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(STORAGE_KEYS.selectedReferral)
}

/** Queue token/expiry are keyed per-event — see lib/queue-client.ts for the key builders. */
export function readQueueSession(eventId: string, tokenKey: string, expiryKey: string) {
  if (typeof window === "undefined") return null
  const token = sessionStorage.getItem(tokenKey)
  const expiry = sessionStorage.getItem(expiryKey)
  if (!token || !expiry) return null
  return { token, expiry: Number(expiry) }
}
