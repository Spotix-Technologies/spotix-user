"use client"

import { useEffect, useState } from "react"
import { getCart, subscribeToCart, type CartLine } from "./cart"

/** Live view of this event's shop cart — re-reads localStorage on mount
 *  and whenever cart.ts's mutators fire (same tab or another one). */
export function useShopCart(eventId: string) {
  const [cart, setCart] = useState<CartLine[]>([])

  useEffect(() => {
    setCart(getCart(eventId))
    return subscribeToCart(eventId, setCart)
  }, [eventId])

  const count = cart.reduce((sum, l) => sum + l.quantity, 0)
  const subtotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0)

  return { cart, count, subtotal }
}
