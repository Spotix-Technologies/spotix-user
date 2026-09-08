/**
 * lib/derive-fee-breakdown.ts
 *
 * The Reference doc behind an MCP order only carries three price fields —
 * ticketPrice (subtotal), transactionFee (Spotix's platform fee), and
 * totalAmount (what the buyer is actually charged). totalAmount is set
 * server-side by spotix-backend's computeOrderPricing (see
 * src/utils/priceUtility.ts) and, whenever the buyer also bears Paystack's
 * processing fee, is LARGER than ticketPrice + transactionFee — that gap
 * was previously invisible on this page, which showed "Subtotal", "Fee"
 * (transactionFee only), and "Amount to pay" (totalAmount) as if the first
 * two summed to the third. They don't, hence the discrepancy: e.g.
 * Subtotal ₦10,000 + Fee ₦700 = ₦10,700, but Amount to pay showed
 * ₦10,960.5.
 *
 * Rather than re-deriving Paystack's fee formula here (and risking it
 * drifting from whatever spotix-backend actually charged — discounts,
 * addons, and Burden of Fee can all change the inputs), this simply backs
 * the remainder out of the numbers the backend already committed to:
 * whatever totalAmount doesn't account for via subtotal + platform fee is
 * attributed to payment processing. That guarantees the breakdown always
 * sums to the real total, no matter how the backend arrived at it.
 */

export interface McpFeeBreakdown {
  subtotal: number
  platformFee: number
  /** Remainder between totalAmount and (subtotal + platformFee) — covers
   *  Paystack's processing fee and anything else folded into the backend's
   *  total that isn't broken out as its own field. Never negative. */
  processingFee: number
  total: number
}

export function deriveMcpFeeBreakdown(input: {
  ticketPrice: number
  transactionFee: number
  totalAmount: number
}): McpFeeBreakdown {
  const subtotal = Number(input.ticketPrice) || 0
  const platformFee = Number(input.transactionFee) || 0
  const total = Number(input.totalAmount) || 0

  const processingFee = Math.max(0, total - subtotal - platformFee)

  return { subtotal, platformFee, processingFee, total }
}
