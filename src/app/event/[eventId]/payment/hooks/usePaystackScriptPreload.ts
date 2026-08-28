// app/event/[eventId]/payment/hooks/usePaystackScriptPreload.ts
"use client"

import { useEffect } from "react"
import type { PaymentData } from "../types"

/**
 * Preloads the Paystack inline script as early as possible — as soon as
 * we know this is a paid event, not when the Paystack modal mounts.
 */
export function usePaystackScriptPreload(paymentData: PaymentData | null): void {
  useEffect(() => {
    if (!paymentData || paymentData.ticketPrice === 0) return
    if (typeof window === "undefined" || window.PaystackPop) return
    if (document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]')) return

    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    document.body.appendChild(script)
    // Deliberately not removed on unmount — once loaded, window.PaystackPop
    // should stay available for the rest of the checkout session.
  }, [paymentData])
}
