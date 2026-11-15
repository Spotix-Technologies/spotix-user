/** Lowest ticket price for an event (0 for free events), or null when there are no tickets. */
export function getStartingPrice(event: {
  isFree: boolean
  ticketPrices?: { price: number | string }[]
}): number | null {
  if (event.isFree) return 0
  const prices = (event.ticketPrices ?? []).map((t) => Number(t.price) || 0)
  return prices.length ? Math.min(...prices) : null
}
