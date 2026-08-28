
export const BRAND_PURPLE = "#6b2fa5"

export const STORAGE_KEYS = {
  cart: "spotix_cart",
  organizer: "spotix_organizer",
  guestCheckout: "spotix_guest_checkout",
  paymentData: "spotix_payment_data",
  paystackPaymentData: "paystack_payment_data",
  selectedReferral: "selected_referral_code",
} as const

/**
 * How often we silently re-check a resumed "pending" reference's status
 * while the buyer sits on the checkout page — this is what turns "refresh
 * mid-payment" into automatic feedback instead of a dead end. See
 * hooks/usePaymentRecovery logic inside EventPaymentClient.
 */
export const PENDING_REFERENCE_POLL_MS = 7000

/** Query param the payment page reads/writes to recover a payment across a refresh. */
export const REF_QUERY_PARAM = "ref"
