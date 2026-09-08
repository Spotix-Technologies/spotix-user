/**
 * src/app/event/[eventId]/shop/lib/cart.ts
 *
 * Client-side merch cart for the shop route group — persisted in
 * localStorage per event, so it survives navigation between the shop
 * listing, a merch details page, and the payment page (three separate
 * Next.js routes, not just in-memory component state). The server
 * always re-validates price/stock from Supabase at checkout (see
 * /api/v1/create-merch-ref) — this is purely a client-side convenience
 * cache, never trusted for the actual charge.
 */

export interface CartLine {
  id: string
  name: string
  /** Buyer-facing price per unit, already fee-adjusted for this event's
   *  Burden of Fee setting — see /api/v1/event/merch and
   *  utils/merchPricing.ts. */
  price: number
  image: string
  stock: number
  quantity: number
}

const CART_CHANGED_EVENT = "spotix-shop-cart-changed"

function storageKey(eventId: string) {
  return `spotix_shop_cart_${eventId}`
}

export function getCart(eventId: string): CartLine[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(storageKey(eventId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persist(eventId: string, lines: CartLine[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(storageKey(eventId), JSON.stringify(lines))
  // 'storage' only fires in OTHER tabs — dispatch our own event so
  // anything mounted in this same tab (e.g. a cart badge) updates too.
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: { eventId } }))
}

export function addToCart(eventId: string, item: Omit<CartLine, "quantity">, quantity = 1): CartLine[] {
  const cart = getCart(eventId)
  const existing = cart.find((l) => l.id === item.id)
  const nextLines = existing
    ? cart.map((l) =>
        l.id === item.id ? { ...l, ...item, quantity: Math.min(l.quantity + quantity, item.stock) } : l
      )
    : [...cart, { ...item, quantity: Math.min(Math.max(quantity, 1), item.stock) }]
  persist(eventId, nextLines)
  return nextLines
}

export function updateQuantity(eventId: string, itemId: string, quantity: number): CartLine[] {
  const cart = getCart(eventId)
  const nextLines =
    quantity <= 0
      ? cart.filter((l) => l.id !== itemId)
      : cart.map((l) => (l.id === itemId ? { ...l, quantity: Math.min(quantity, l.stock) } : l))
  persist(eventId, nextLines)
  return nextLines
}

export function removeFromCart(eventId: string, itemId: string): CartLine[] {
  return updateQuantity(eventId, itemId, 0)
}

export function clearCart(eventId: string): void {
  persist(eventId, [])
}

/** Subscribe to cart changes for this event — same-tab (custom event)
 *  and cross-tab (storage event). Returns an unsubscribe function. */
export function subscribeToCart(eventId: string, callback: (lines: CartLine[]) => void): () => void {
  const handleCustom = (e: Event) => {
    const detail = (e as CustomEvent).detail
    if (!detail || detail.eventId === eventId) callback(getCart(eventId))
  }
  const handleStorage = (e: StorageEvent) => {
    if (e.key === storageKey(eventId)) callback(getCart(eventId))
  }
  window.addEventListener(CART_CHANGED_EVENT, handleCustom)
  window.addEventListener("storage", handleStorage)
  return () => {
    window.removeEventListener(CART_CHANGED_EVENT, handleCustom)
    window.removeEventListener("storage", handleStorage)
  }
}
