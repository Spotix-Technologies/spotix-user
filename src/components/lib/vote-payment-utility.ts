/**
 * src/components/lib/vote-payment-utility.ts
 *
 * Pure "logic" layer for the voting-purchase Paystack flow — no React
 * state. Mirrors ticket-payment-utility.ts but for voting_purchase
 * references (poll/contestant/category fields instead of event fields).
 * Imported into PayWithPaystack.tsx.
 */

import { splitFullName } from "./paystack-shared"

export interface VotePaystackMetadata {
  pollId:          string
  pollName:        string
  contestantId:    string
  contestantName:  string
  voteCount:       number
  organizerId:     string
  categoryId?:     string | null
  /** Allows callers to pass through extra bookkeeping fields if needed later. */
  [key: string]: any
}

export interface VoteWithPaystackParams {
  paystackKey: string
  email:       string
  /** Naira, not kobo — converted internally. */
  amount:      number
  reference:   string
  fullName:    string
  phone:       string
  metadata:    VotePaystackMetadata
  onSuccess:   (reference: string) => void
  /** Fires when the buyer closes the Paystack widget without completing payment. */
  onClose:     () => void
}

/**
 * Builds and opens the Paystack inline checkout for a voting purchase.
 * Returns the Paystack handler instance, or null if window.PaystackPop
 * isn't ready yet.
 */
export function voteWithPaystack(params: VoteWithPaystackParams) {
  const PS = (window as any).PaystackPop
  if (!PS) return null

  const { firstName, lastName } = splitFullName(params.fullName)

  const handler = PS.setup({
    key:      params.paystackKey,
    email:    params.email,
    amount:   Math.round(params.amount * 100), // kobo
    currency: "NGN",
    ref:      params.reference,

    first_name: firstName,
    last_name:  lastName,
    phone:      params.phone ?? "",

    metadata: {
      custom_fields: [
        { display_name: "Transaction Type", variable_name: "type",            value: "voting_purchase" },
        { display_name: "Full Name",        variable_name: "full_name",       value: params.fullName ?? "" },
        { display_name: "Phone",            variable_name: "phone_number",    value: params.phone ?? "" },
        { display_name: "Poll",             variable_name: "poll_name",       value: params.metadata.pollName },
        { display_name: "Contestant",       variable_name: "contestant_name", value: params.metadata.contestantName },
        { display_name: "Vote Count",       variable_name: "vote_count",      value: String(params.metadata.voteCount) },
        { display_name: "Poll ID",          variable_name: "poll_id",         value: params.metadata.pollId },
        { display_name: "Organizer ID",     variable_name: "organizer_id",    value: params.metadata.organizerId },
        { display_name: "Contestant ID",    variable_name: "contestant_id",   value: params.metadata.contestantId },
        ...(params.metadata.categoryId
          ? [{ display_name: "Category ID", variable_name: "category_id", value: params.metadata.categoryId }]
          : []),
      ],
    },

    callback: (response: any) => params.onSuccess(response.reference),
    onClose:  () => params.onClose(),
  })

  return handler
}
