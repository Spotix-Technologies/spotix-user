/**
 * src/utils/paymentMessages.ts
 *
 * Shared (client + server safe — no Firebase/Node-only imports) helpers for
 * recognising Paystack's "incorrect amount sent" response and surfacing a
 * consistent status + message to users across the voting and ticket
 * payment flows.
 *
 * Some buyers transfer either above or below the expected amount. When the
 * backend reconciles a reference against Paystack and the gateway comes
 * back with that message, we mark the reference `incorrect_payment`
 * instead of leaving it as a generic "failed" so the UI can explain what
 * actually happened and how it gets resolved.
 */

export const INCORRECT_PAYMENT_STATUS = "incorrect_payment" as const

/** Case-insensitive substring Paystack uses for this specific failure. */
const INCORRECT_AMOUNT_SIGNATURE = "incorrect amount sent"

/**
 * True if the given gateway message indicates the buyer sent the wrong
 * amount (over or under) rather than a genuine payment failure.
 */
export function isIncorrectAmountMessage(message?: string | null): boolean {
  if (!message) return false
  return message.toLowerCase().includes(INCORRECT_AMOUNT_SIGNATURE)
}

/**
 * Given a raw status + optional gateway/failure message, returns the
 * status that should actually be shown to the user — promoting to
 * `incorrect_payment` when the message matches, regardless of whether the
 * raw status was "failed" or something else.
 */
export function resolveDisplayStatus(
  rawStatus: string | null | undefined,
  failureMessage?: string | null
): string {
  if (isIncorrectAmountMessage(failureMessage)) return INCORRECT_PAYMENT_STATUS
  return rawStatus ?? "pending"
}

/** Standard copy shown wherever an incorrect_payment status is surfaced. */
export const INCORRECT_PAYMENT_NOTICE =
  "It looks like you transferred an incorrect amount for this payment. " +
  "Don't worry — a reversal will be made back to your original payment method " +
  "within 48 business hours. If you don't see it reflected after that, please reach out to support."
