/**
 * Platform fee math — shared by every checkout flow that needs to turn a
 * ticket price into the buyer-facing fee (transactionFee) added on top.
 *
 * The formula is always: (percentageFee% of ticketPrice) + flatFee.
 * System default is 5% + ₦100, but each event can override both halves
 * independently from the admin dashboard (event-data → Platform Fees).
 * See resolvePlatformFeeRates() for exactly how an event's stored fields
 * resolve to the rates actually charged at purchase time.
 */

/** System-wide default percentage fee, in whole percent (5 = 5%). */
export const DEFAULT_PLATFORM_PERCENTAGE_FEE = 5;

/** System-wide default flat fee, in naira. Only used as the admin UI's
 *  starting suggestion — NOT as a compute-time fallback (see below). */
export const DEFAULT_PLATFORM_FLAT_FEE = 100;

export interface PlatformFeeRates {
  /** Fraction of ticket price charged as fee, e.g. 0.05 for 5%. */
  percentageFee: number;
  /** Flat naira amount added on top of the percentage fee. */
  flatFee: number;
}

/** Shape of the event fields this reads — a subset so callers can pass
 *  their own event/EventType objects without extra mapping. */
export interface PlatformFeeSource {
  platformPercentageFee?: number | null;
  platformFlatFee?: number | null;
}

/**
 * Resolves the fee rates actually in effect for an event.
 *
 * - platformPercentageFee: whole percent (e.g. 5) stored on the event doc.
 *   Missing/null → falls back to the system default (5%), so events that
 *   predate this feature keep behaving exactly as before.
 * - platformFlatFee: naira amount stored on the event doc. Missing/null →
 *   resolves to 0, NOT the ₦100 default. An event with no flat fee stored
 *   means an admin (or the event's original setup) deliberately decided
 *   not to charge one — it is never silently assumed. An explicit 0 and a
 *   genuinely absent field behave identically here, which is intentional.
 */
export function resolvePlatformFeeRates(event?: PlatformFeeSource | null): PlatformFeeRates {
  const rawPercentage = event?.platformPercentageFee;
  const percentagePercent =
    typeof rawPercentage === "number" && Number.isFinite(rawPercentage)
      ? rawPercentage
      : DEFAULT_PLATFORM_PERCENTAGE_FEE;

  const rawFlat = event?.platformFlatFee;
  const flatFee = typeof rawFlat === "number" && Number.isFinite(rawFlat) ? rawFlat : 0;

  return { percentageFee: percentagePercent / 100, flatFee };
}

/**
 * Calculates the platform/transaction fee for a single ticket price.
 * This is to ensure burden of fee is on users, not event creators.
 * @param ticketPrice - The original ticket price (must be a number)
 * @param rates - Effective fee rates for the event (see resolvePlatformFeeRates)
 * @returns The fee amount (as a number)
 */
export const calculateVATFee = (ticketPrice: number, rates: PlatformFeeRates): number => {
  // Free tickets have no VAT or platform fee
  if (!ticketPrice) return 0;

  const percentagePortion = ticketPrice * rates.percentageFee;
  return percentagePortion + rates.flatFee;
};

/**
 * Calculate the final ticket price including the platform fee.
 * @param ticketPrice - The original ticket price (must be a number)
 * @param rates - Effective fee rates for the event
 * @returns The final price (original price + fee, as a number)
 */
export const calculateFinalPrice = (ticketPrice: number, rates: PlatformFeeRates): number => {
  const vatFee = calculateVATFee(ticketPrice, rates);
  return ticketPrice + vatFee;
};

/**
 * Get pricing breakdown for a ticket.
 * @param ticketPrice - The original ticket price
 * @param rates - Effective fee rates for the event
 * @returns Object containing original price, fee, and final price
 */
export const getPricingBreakdown = (ticketPrice: number, rates: PlatformFeeRates) => {
  const vatFee = calculateVATFee(ticketPrice, rates);
  const finalPrice = ticketPrice + vatFee;

  return {
    originalPrice: ticketPrice,
    vatFee,
    finalPrice,
  };
};

// ─── Paystack's fee, Burden of Fee, and Addons ─────────────────────────────
//
// Spotix's own platform fee (above) is one of THREE things that can be
// added on top of a ticket's price at checkout. The other two:
//
//  - Paystack's own processing fee (calculatePaystackFee below) — real
//    money Paystack takes off the transaction, previously silently
//    absorbed out of Spotix's own cut and never shown to anyone.
//  - Addons (see AddonInput) — per-ticket extras an organizer asked
//    Spotix to add (e.g. wristbands), created by an admin/support agent
//    from spotix-admin.
//
// Burden of Fee (resolveFeeBurden) controls who pays the first two —
// independently of each other, and independently of addons, which have
// their own per-addon coveredBy flag. computeOrderPricing() is the one
// function that turns all of this into what a buyer actually owes; every
// checkout surface (buy-ticket-dialog, the payment page, create-pay-ref)
// calls into it rather than reimplementing this math.

/** Real Paystack fee for a local NGN charge: 1.5% + ₦100, but the ₦100
 *  is waived under ₦2,500, and the total is capped at ₦2,000 no matter
 *  how large the transaction. Verified against Paystack's own pricing
 *  docs (Aug 2026) — NOT the "under/over ₦2,000" split as first assumed. */
export function calculatePaystackFee(amount: number): number {
  if (!amount || amount <= 0) return 0;
  const raw = amount * 0.015 + (amount >= 2500 ? 100 : 0);
  return Math.min(2000, raw);
}

export interface FeeBurden {
  /** Organizer absorbs Paystack's processing fee instead of the attendee. */
  coversPaystackFee: boolean;
  /** Organizer absorbs Spotix's platform fee instead of the attendee. */
  coversSpotixFee: boolean;
  /** Only meaningful when coversPaystackFee is true — WHO absorbs it.
   *  "organizer" (default): deducted from the organizer's payout balance,
   *  same as before this field existed. "spotix": the organizer's payout
   *  is left untouched; spotix-backend simply doesn't deduct anything, so
   *  the shortfall between what Paystack actually remits and what's paid
   *  out comes out of Spotix's own platform-fee margin instead. Set from
   *  spotix-admin only — organizers can choose to cover it themselves via
   *  coversPaystackFee, but can't shift it onto Spotix's books themselves. */
  paystackFeeAbsorbedBy: "organizer" | "spotix";
}

export interface FeeBurdenSource {
  feeBurden?: {
    coversPaystackFee?: boolean | null;
    coversSpotixFee?: boolean | null;
    paystackFeeAbsorbedBy?: "organizer" | "spotix" | null;
  } | null;
  /** Legacy single-toggle field from before Paystack's fee was split out
   *  as its own concept. See resolveFeeBurden for the migration. */
  buyerBearsBurden?: boolean | null;
}

/**
 * Resolves who pays what, for an event. Two independent switches rather
 * than one enum, so all four combinations (attendee pays everything /
 * organizer covers Paystack only / organizer covers Spotix only /
 * organizer covers both) are representable without special-casing.
 * paystackFeeAbsorbedBy is a third, narrower dimension layered on top of
 * coversPaystackFee — see FeeBurden's doc comment.
 *
 * Legacy events that only ever had `buyerBearsBurden` (before this
 * feature) map onto the new shape as: buyerBearsBurden === false meant
 * "organizer covers Spotix's fee" under the old model, and Paystack's fee
 * wasn't a distinct concept yet so it stays attendee-owed either way.
 */
export function resolveFeeBurden(event?: FeeBurdenSource | null): FeeBurden {
  if (event?.feeBurden && typeof event.feeBurden === "object") {
    return {
      coversPaystackFee: event.feeBurden.coversPaystackFee === true,
      coversSpotixFee: event.feeBurden.coversSpotixFee === true,
      paystackFeeAbsorbedBy: event.feeBurden.paystackFeeAbsorbedBy === "spotix" ? "spotix" : "organizer",
    };
  }
  return { coversPaystackFee: false, coversSpotixFee: event?.buyerBearsBurden === false, paystackFeeAbsorbedBy: "organizer" };
}

export interface AddonInput {
  id: string;
  name: string;
  /** Naira amount charged per ticket. */
  pricePerTicket: number;
  /** "attendee" — added to what the buyer pays, per ticket, same as the
   *  platform fee. "organizer" — never shown to the buyer; deducted from
   *  the organizer's payout balance per ticket sold instead. */
  coveredBy: "attendee" | "organizer";
}

export interface OrderPricingInput {
  /** Sum of (ticket price × quantity) across every ticket type in the cart. */
  ticketSubtotal: number;
  /** Total ticket count across every type — addons are billed uniformly
   *  per ticket, not per ticket type. */
  totalTicketCount: number;
  /** Sum of (per-ticket Spotix fee × quantity) — i.e. the same total the
   *  existing calculateVATFee/feeRates math already produces per ticket
   *  type, added up. Computed by the caller since it already has the
   *  per-type prices and resolvePlatformFeeRates() result. */
  spotixFeeTotal: number;
  feeBurden: FeeBurden;
  /** Every active addon on the event. Split internally by coveredBy. */
  addons?: AddonInput[];
}

export interface OrderPricingBreakdown {
  ticketSubtotal: number;
  spotixFeeTotal: number;
  /** Attendee-billed addons only, summed across all tickets in the cart. */
  addonFeeTotal: number;
  /** Organizer-covered addons, summed across all tickets — never charged
   *  to the buyer; this is what spotix-backend deducts from payout. */
  organizerAddonCostTotal: number;
  /** Real Paystack fee for this transaction, regardless of who bears it —
   *  Paystack takes this off the top either way. Reference for display/
   *  audit; see paystackFeeChargedToBuyer / organizerPaystackFeeCost for
   *  which side of the ledger it actually lands on. */
  paystackFeeTotal: number;
  /** Added to what the buyer pays — 0 when the organizer covers it. */
  paystackFeeChargedToBuyer: number;
  /** Deducted from the organizer's payout — 0 when the buyer covers it.
   *  This is what spotix-backend reads to reduce admin/events balance. */
  organizerPaystackFeeCost: number;
  /** false when the organizer covers this fee — buyer doesn't pay it. */
  buyerOwesSpotixFee: boolean;
  buyerOwesPaystackFee: boolean;
  /** What the buyer is actually charged, all-in. */
  totalPayable: number;
}

/**
 * The single source of truth for what a buyer pays and what an organizer's
 * payout is reduced by. Every checkout surface should call this rather
 * than reassembling the fee/addon/burden logic itself.
 *
 * Paystack's real fee (paystackFeeTotal) is computed once, on the
 * pre-Paystack-fee payable amount (ticket subtotal + Spotix fee if
 * buyer-owed + attendee-billed addons), REGARDLESS of who bears it —
 * Paystack takes its cut off the actual transaction either way. What
 * differs by burden is only which side of the ledger it lands on:
 * added to what the buyer pays (paystackFeeChargedToBuyer), or deducted
 * from the organizer's payout instead (organizerPaystackFeeCost) — never
 * both, and the amount itself is identical either way.
 *
 * This additive approach (compute once, add on top) matches how Spotix's
 * own fee already works, rather than an algebraic gross-up. For typical
 * ticket prices the difference from an exact gross-up is negligible (a
 * few naira, and nothing once the ₦2,000 Paystack cap is hit) — flagged
 * here in case exact precision later matters enough to justify the
 * fussier iterative formula.
 */
export function computeOrderPricing(input: OrderPricingInput): OrderPricingBreakdown {
  const { ticketSubtotal, totalTicketCount, spotixFeeTotal, feeBurden, addons = [] } = input;

  const attendeeAddonPerTicket = addons
    .filter((a) => a.coveredBy === "attendee")
    .reduce((sum, a) => sum + (Number(a.pricePerTicket) || 0), 0);
  const organizerAddonPerTicket = addons
    .filter((a) => a.coveredBy === "organizer")
    .reduce((sum, a) => sum + (Number(a.pricePerTicket) || 0), 0);

  const addonFeeTotal = attendeeAddonPerTicket * totalTicketCount;
  const organizerAddonCostTotal = organizerAddonPerTicket * totalTicketCount;

  const buyerOwesSpotixFee = !feeBurden.coversSpotixFee;
  const buyerOwesPaystackFee = !feeBurden.coversPaystackFee;

  const preFeeAmount = ticketSubtotal + (buyerOwesSpotixFee ? spotixFeeTotal : 0) + addonFeeTotal;
  const paystackFeeTotal = calculatePaystackFee(preFeeAmount);
  const paystackFeeChargedToBuyer = buyerOwesPaystackFee ? paystackFeeTotal : 0;
  const organizerPaystackFeeCost = buyerOwesPaystackFee ? 0 : paystackFeeTotal;

  return {
    ticketSubtotal,
    spotixFeeTotal,
    addonFeeTotal,
    organizerAddonCostTotal,
    paystackFeeTotal,
    paystackFeeChargedToBuyer,
    organizerPaystackFeeCost,
    buyerOwesSpotixFee,
    buyerOwesPaystackFee,
    totalPayable: preFeeAmount + paystackFeeChargedToBuyer,
  };
}
