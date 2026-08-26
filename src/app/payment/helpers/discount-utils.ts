// app/payment/helpers/discount-utils.ts
//
// Single source of truth for discount data shape + math on the user-facing
// checkout. Mirrors the field names returned by POST /api/v1/discount so
// nothing has to be remapped after fetch. Previously EventPaymentClient.tsx
// duplicated the discount-amount calculation in two places (initial ref
// creation + render) and neither knew about per-ticket eligibility — this
// consolidates both into calculateDiscount().

export interface DiscountData {
  id: string
  code: string
  discountType: "percentage" | "flat"
  discountValue: number
  maxUses: number
  currentUses: number
  expiryDate: string | null
  /** Ticket policy names (from event.ticketPrices[].policy) this code applies to.
   *  null/empty = applies to every ticket type. */
  applicableTickets: string[] | null
}

export interface DiscountCartItem {
  ticketType: string
  price: number
  quantity: number
  vat?: number
}

/** True when a discount is scoped to specific ticket types and this one isn't among them. */
export function isTicketExcludedFromDiscount(
  discountData: Pick<DiscountData, "applicableTickets">,
  ticketType: string
): boolean {
  const scope = discountData.applicableTickets
  if (!scope || scope.length === 0) return false
  return !scope.includes(ticketType)
}

/**
 * Computes the discount amount for a cart, respecting per-ticket-type
 * eligibility. Only line items whose ticketType is in `applicableTickets`
 * (or every item, when unscoped) count toward the discountable subtotal.
 * A flat discount is capped at that subtotal so totals never go negative.
 */
export function calculateDiscount(
  cart: DiscountCartItem[],
  discountData: DiscountData | null
): { discountAmount: number; eligibleSubtotal: number } {
  if (!discountData || cart.length === 0) return { discountAmount: 0, eligibleSubtotal: 0 }

  const eligibleSubtotal = cart.reduce((sum, item) => {
    if (isTicketExcludedFromDiscount(discountData, item.ticketType)) return sum
    return sum + item.price * item.quantity
  }, 0)

  if (eligibleSubtotal <= 0) return { discountAmount: 0, eligibleSubtotal: 0 }

  const discountAmount =
    discountData.discountType === "percentage"
      ? (eligibleSubtotal * discountData.discountValue) / 100
      : Math.min(discountData.discountValue, eligibleSubtotal)

  return { discountAmount, eligibleSubtotal }
}
