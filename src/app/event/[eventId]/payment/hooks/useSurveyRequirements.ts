// app/event/[eventId]/payment/hooks/useSurveyRequirements.ts
"use client"

import { useEffect, useState } from "react"
import type { CartItem, PaymentData, UserData } from "../types"

/** Checks survey/form requirements for every unique ticket type in the cart. */
export function useSurveyRequirements(
  paymentData: PaymentData | null,
  cart: CartItem[],
  userData: UserData | null
) {
  const [surveyRequiredTickets, setSurveyRequiredTickets] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!paymentData || cart.length === 0 || !userData) return

    let cancelled = false

    const checkAllTicketsSurveyRequirements = async () => {
      const requiredTickets = new Set<string>()

      try {
        const uniqueTicketTypes = Array.from(new Set(cart.map((item) => item.ticketType)))

        for (const ticketType of uniqueTicketTypes) {
          const response = await fetch(
            `/api/v1/survey?eventId=${paymentData.eventId}&ticketType=${encodeURIComponent(ticketType)}`
          )
          if (response.ok) {
            const result = await response.json()
            if (result.requiresForm) requiredTickets.add(ticketType)
          }
        }

        if (!cancelled) setSurveyRequiredTickets(requiredTickets)
      } catch (error) {
        console.error("Error checking survey requirements:", error)
      }
    }

    checkAllTicketsSurveyRequirements()
    return () => {
      cancelled = true
    }
  }, [paymentData, cart, userData])

  return surveyRequiredTickets
}
