/**
 * src/components/lib/ticket-payment-utility.ts
 *
 * Pure "logic" layer for the ticket-purchase Paystack flow — no React
 * state. Builds the Paystack inline-checkout config (first_name/last_name
 * split from the full name, phone, custom_fields) and opens it. Imported
 * into PayWithPaystack.tsx, which owns all the UI/lifecycle state
 * (script loading, phone prompt, abandonment dialog, errors).
 */

import { splitFullName } from "./paystack-shared"

export interface TicketPaystackMetadata {
  eventId:         string
  eventName:       string
  ticketType?:     string
  /** Naira price of a single ticket — informational, not sent as its own Paystack field. */
  ticketPrice?:    number
  eventCreatorId:  string
  userId?:         string | null
  discountCode?:   string | null
  referralCode?:   string | null
  /** Allows callers (e.g. PaymentClient) to pass through extra bookkeeping fields like `cart`. */
  [key: string]: any
}

export interface TicketWithPaystackParams {
  paystackKey: string
  email:       string
  /** Naira, not kobo — converted internally. */
  amount:      number
  reference:   string
  fullName:    string
  phone:       string
  metadata:    TicketPaystackMetadata
  /** Paystack channels to restrict checkout to, e.g. ["card"]. Empty/omitted = Paystack's default full picker. */
  channels?:   string[]
  onSuccess:   (reference: string) => void
  /** Fires when the buyer closes the Paystack widget without completing payment. */
  onClose:     () => void
}

/**
 * Builds and opens the Paystack inline checkout for a ticket purchase.
 * Returns the Paystack handler instance, or null if window.PaystackPop
 * isn't ready yet.
 */
export function ticketWithPaystack(params: TicketWithPaystackParams) {
  const PS = (window as any).PaystackPop
  if (!PS) return null

  const { firstName, lastName } = splitFullName(params.fullName)

  const handler = PS.setup({
    key:      params.paystackKey,
    email:    params.email,
    amount:   Math.round(params.amount * 100), // kobo
    currency: "NGN",
    ref:      params.reference,
    ...(params.channels && params.channels.length > 0 ? { channels: params.channels } : {}),

    first_name: firstName,
    last_name:  lastName,
    phone:      params.phone ?? "",

    metadata: {
      custom_fields: [
        { display_name: "Transaction Type", variable_name: "type",             value: "ticket_purchase" },
        { display_name: "Full Name",        variable_name: "full_name",        value: params.fullName ?? "" },
        { display_name: "Phone Number",     variable_name: "phone_number",     value: params.phone ?? "" },
        { display_name: "Event Name",       variable_name: "event_name",       value: params.metadata.eventName },
        ...(params.metadata.ticketType
          ? [{ display_name: "Ticket Type", variable_name: "ticket_type", value: params.metadata.ticketType }]
          : []),
        { display_name: "Event ID",         variable_name: "event_id",         value: params.metadata.eventId },
        { display_name: "Event Creator",    variable_name: "event_creator_id", value: params.metadata.eventCreatorId },
        { display_name: "User ID",          variable_name: "user_id",          value: params.metadata.userId ?? "" },
        ...(params.metadata.discountCode
          ? [{ display_name: "Discount Code", variable_name: "discount_code", value: params.metadata.discountCode }]
          : []),
        ...(params.metadata.referralCode
          ? [{ display_name: "Referral Code", variable_name: "referral_code", value: params.metadata.referralCode }]
          : []),
      ],
    },

    callback: (response: any) => params.onSuccess(response.reference),
    onClose:  () => params.onClose(),
  })

  return handler
}
