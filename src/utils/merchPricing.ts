/**
 * src/utils/merchPricing.ts
 *
 * Buyer-facing merch price helper — turns a raw Supabase listing price
 * (src/app/lib/merch-listings.ts) into what a buyer should actually see,
 * given an event's Burden of Fee setting (resolveFeeBurden, from
 * priceUtility.ts). Shared by /api/v1/event/merch (the merch-section
 * teaser + the full /shop listing) and the merch details page's SSR
 * props, so the number shown never drifts between surfaces.
 *
 * Paystack's own processing fee is intentionally left out of this — it's
 * cart-wide (depends on the whole transaction total), not attributable
 * to a single item, and only resolved at checkout by create-merch-ref /
 * computeOrderPricing. Surfaces that use this should separately hint at
 * it via feeBurden.buyerOwesPaystackFee (e.g. "Paystack's fee is added
 * at checkout") rather than trying to bake it into a per-item price.
 */

import { MERCH_FEE_RATE, type FeeBurden } from "./priceUtility"

/**
 * Per-unit buyer-facing price for a merch listing — bakes in Spotix's
 * flat merch fee when the buyer (not the organizer) covers it under
 * THIS LISTING's own fee_burden (from Supabase, see merch-listings.ts —
 * NOT an event's Burden-of-Fee setting, which is a ticket-only concept).
 * Rounded to the nearest naira. Only `coversSpotixFee` is read, so a bare
 * `{ coversSpotixFee }` (as stored per-listing) works without needing the
 * full ticket-oriented FeeBurden shape.
 */
export function computeMerchDisplayPrice(
  rawPrice: number,
  feeBurden: Pick<FeeBurden, "coversSpotixFee">
): number {
  const spotixFeePerUnit = feeBurden.coversSpotixFee ? 0 : rawPrice * MERCH_FEE_RATE
  return Math.round(rawPrice + spotixFeePerUnit)
}
