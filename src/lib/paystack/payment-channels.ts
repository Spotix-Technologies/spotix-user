/**
 * src/lib/paystack/payment-channels.ts
 *
 * The ticket checkout's "How would you like to pay?" step shows a short
 * list of payment methods BEFORE the Paystack widget opens, and each
 * selection is passed straight to PayWithPaystack's open() as `channels`,
 * which forwards it to PaystackPop.setup()'s `channels` option so
 * Paystack's own checkout skips straight to that method instead of
 * showing every option again.
 *
 * Mirrors spotix-vote's src/lib/paystack/payment-channels.ts. Apple Pay is
 * listed (on Apple devices only, see device.ts) but isn't wired to a real
 * Paystack channel yet — it's shown greyed out and is not selectable.
 *
 * A NOTE ON "MOBILE MONEY": Paystack's `mobile_money` channel is a Ghana/
 * Kenya-style wallet charge and isn't a real, restrictable channel for NGN
 * transactions — passing `channels: ["mobile_money"]` on an NGN charge is
 * silently ignored by Paystack, which is why it used to fall back to
 * showing every channel in the popup instead of narrowing down to one.
 * In Nigeria, wallet apps people think of as "mobile money" — OPay,
 * PalmPay, Kuda, Carbon, Moniepoint, etc. — are surfaced as banks inside
 * Paystack's "Pay with Bank" flow, so the "Mobile Money" option here maps
 * to the `bank` channel, which is what actually opens straight to that
 * OPay/PalmPay/Kuda list instead of the full picker.
 */

export type PaymentMethodId = "bank_transfer" | "card" | "mobile_money" | "ussd" | "apple_pay"

export interface PaymentMethodOption {
  id: PaymentMethodId
  label: string
  description: string
  /** Paystack `channels` values this method maps to. Empty = not wired up yet. */
  channels: string[]
  /** True if selecting this method should actually proceed to checkout. */
  available: boolean
}

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  {
    id: "card",
    label: "Card",
    description: "Pay with your debit or credit card",
    channels: ["card"],
    available: true,
  },
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    description: "Transfer directly from your bank app",
    channels: ["bank_transfer"],
    available: true,
  },
  {
    id: "ussd",
    label: "USSD",
    description: "Dial a code from any phone, no data required",
    channels: ["ussd"],
    available: true,
  },
  {
    id: "mobile_money",
    label: "Mobile Money",
    description: "Pay with OPay, PalmPay, Kuda & more",
    // Real NGN wallet apps live under Paystack's "bank" channel, not
    // "mobile_money" — see the note above.
    channels: ["bank"],
    available: true,
  },
  {
    id: "apple_pay",
    label: "Apple Pay",
    description: "Pay instantly with Apple Pay",
    channels: [],
    available: false,
  },
]

/**
 * The transient notice shown for ~1.3s right before the widget opens
 * (or, for Apple Pay, shown and left up since there's nothing to open).
 */
export function getPaymentMethodNotice(id: PaymentMethodId, amount: number): string {
  if (id === "bank_transfer") {
    return `Kindly ensure to transfer exactly ₦${amount.toLocaleString()} to prevent a failed transaction.`
  }
  if (id === "ussd") {
    return "You'll get a USSD code to dial from your registered phone number."
  }
  if (id === "apple_pay") {
    return "Apple Pay is not available yet."
  }
  return "Initializing secure checkout…"
}

export function findPaymentMethod(id: PaymentMethodId): PaymentMethodOption {
  const found = PAYMENT_METHOD_OPTIONS.find((m) => m.id === id)
  if (!found) throw new Error(`Unknown payment method: ${id}`)
  return found
}
