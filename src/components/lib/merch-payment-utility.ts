/**
 * src/components/lib/merch-payment-utility.ts
 *
 * Pure "logic" layer for the merch-purchase Paystack flow — no React
 * state. Mirrors ticket-payment-utility.ts exactly; the only functional
 * difference is the `type` custom_field value ("merch_purchase"), which
 * is what spotix-backend's webhook uses to dispatch to v1/merch.js
 * instead of v1/ticket.js. Imported into PayWithPaystack.tsx alongside
 * ticketWithPaystack/voteWithPaystack.
 *
 * Popup V2 (see paystack-shared.ts / ticket-payment-utility.ts for the full
 * rationale): `new PaystackPop()` + `.newTransaction()`, with Apple Pay
 * routed through `.checkout()` instead since "apple_pay" isn't a valid
 * `channels` value.
 */

import { splitFullName } from "./paystack-shared"

export interface MerchPaystackMetadata {
  eventId: string
  eventName: string
  eventCreatorId: string
  userId?: string | null
  /** Number of distinct line items in the cart — informational only. */
  itemCount?: number
  [key: string]: any
}

export interface MerchWithPaystackParams {
  paystackKey: string
  email: string
  /** Naira, not kobo — converted internally. */
  amount: number
  reference: string
  fullName: string
  phone: string
  metadata: MerchPaystackMetadata
  /** Paystack channels to restrict checkout to, e.g. ["card"]. Empty/omitted = Paystack's default full picker. */
  channels?: string[]
  onSuccess: (reference: string) => void
  /** Fires when the buyer closes the Paystack widget without completing payment. */
  onClose: () => void
}

/**
 * Builds and opens the Paystack inline checkout for a merch purchase.
 * Returns the Paystack PopupTransaction instance, or null if
 * window.PaystackPop isn't ready yet.
 */
export function merchWithPaystack(params: MerchWithPaystackParams) {
  const PS = (window as any).PaystackPop
  if (!PS) return null

  const { firstName, lastName } = splitFullName(params.fullName)
  const isApplePay = !!params.channels?.includes("apple_pay")

  const instance = new PS()

  const config = {
    key: params.paystackKey,
    email: params.email,
    amount: Math.round(params.amount * 100), // kobo
    currency: "NGN",
    ref: params.reference,
    ...(!isApplePay && params.channels && params.channels.length > 0
      ? { channels: params.channels }
      : {}),

    first_name: firstName,
    last_name: lastName,
    phone: params.phone ?? "",

    metadata: {
      custom_fields: [
        { display_name: "Transaction Type", variable_name: "type", value: "merch_purchase" },
        { display_name: "Full Name", variable_name: "full_name", value: params.fullName ?? "" },
        { display_name: "Phone Number", variable_name: "phone_number", value: params.phone ?? "" },
        { display_name: "Event Name", variable_name: "event_name", value: params.metadata.eventName },
        { display_name: "Event ID", variable_name: "event_id", value: params.metadata.eventId },
        { display_name: "Event Creator", variable_name: "event_creator_id", value: params.metadata.eventCreatorId },
        { display_name: "User ID", variable_name: "user_id", value: params.metadata.userId ?? "" },
      ],
    },

    onSuccess: (transaction: any) => params.onSuccess(transaction.reference),
    onCancel: () => params.onClose(),
  }

  // .checkout() returns a Promise (unlike the synchronous .newTransaction()),
  // handled here rather than in PayWithPaystack's try/catch — see
  // ticket-payment-utility.ts for the full explanation.
  if (isApplePay) {
    const result = instance.checkout(config)
    result?.catch?.((err: unknown) => {
      console.error("[merchWithPaystack] Apple Pay checkout error:", err)
    })
    return result
  }

  return instance.newTransaction(config)
}
