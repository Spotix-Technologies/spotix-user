// app/event/[eventId]/payment/hooks/useStoredCheckoutContext.ts
"use client"

import { useEffect, useState } from "react"
import { readCart, readGuestCheckout, readOrganizer, writeGuestCheckout } from "../lib/checkout-storage"
import type { CartItem } from "../types"

/**
 * Loads cart, organizer, and guest data from localStorage on mount
 * (client-side only) — same three reads the original component did in
 * one effect, just relocated.
 */
export function useStoredCheckoutContext() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [organizerName, setOrganizerName] = useState("")
  const [organizerEmail, setOrganizerEmail] = useState("")
  const [organizerId, setOrganizerId] = useState("")
  const [guestFullName, setGuestFullName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestPhone, setGuestPhone] = useState("")

  useEffect(() => {
    setCart(readCart())

    const organizer = readOrganizer()
    if (organizer) {
      setOrganizerName(organizer.organizerName)
      setOrganizerEmail(organizer.organizerEmail)
      setOrganizerId(organizer.organizerId)
    }

    const guest = readGuestCheckout()
    if (guest) {
      setGuestFullName(guest.guestFullName)
      setGuestEmail(guest.guestEmail)
      setGuestPhone(guest.guestPhone)
    }
  }, [])

  const submitGuest = (fullName: string, email: string, phone: string) => {
    setGuestFullName(fullName)
    setGuestEmail(email)
    setGuestPhone(phone)
    writeGuestCheckout({ guestFullName: fullName, guestEmail: email, guestPhone: phone })
  }

  return {
    cart,
    setCart,
    organizerName,
    organizerEmail,
    organizerId,
    guestFullName,
    guestEmail,
    guestPhone,
    setGuestFullName,
    setGuestEmail,
    setGuestPhone,
    submitGuest,
  }
}
