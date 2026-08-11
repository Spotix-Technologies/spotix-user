/**
 * src/components/lib/paystack-shared.ts
 *
 * Small pure helpers shared by ticket-payment-utility.ts and
 * vote-payment-utility.ts. No React, no Firebase — safe to import from
 * either the client component (PayWithPaystack) or the utilities
 * themselves.
 */

export interface SplitName {
  firstName: string
  lastName:  string
}

/**
 * Paystack's checkout form has separate first_name/last_name fields, but
 * Spotix only ever collects a single "full name" field. Per how Paystack
 * expects names to be sent: take the first two space-separated words of
 * the full name as first_name and last_name respectively — anything after
 * the second word (e.g. a middle or extra name) is not appended to
 * last_name.
 *
 * "John Michael Doe" -> { firstName: "John", lastName: "Michael" }
 * "John"              -> { firstName: "John", lastName: "John" }
 * ""                  -> { firstName: "",     lastName: "" }
 */
export function splitFullName(fullName?: string | null): SplitName {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean)
  const firstName = parts[0] ?? ""
  const lastName  = parts[1] ?? firstName
  return { firstName, lastName }
}

declare global {
  interface Window {
    PaystackPop: any
  }
}

/** Whether the Paystack inline script has finished loading. */
export function isPaystackReady(): boolean {
  return typeof window !== "undefined" && !!window.PaystackPop
}

/**
 * Ensures https://js.paystack.co/v1/inline.js is present in the document,
 * reusing an existing <script> tag if one is already loading elsewhere
 * (e.g. another payment component preloaded it). Resolves once
 * window.PaystackPop is available, or after `timeoutMs` elapses.
 */
export function ensurePaystackScriptLoaded(timeoutMs = 15000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isPaystackReady()) {
      resolve(true)
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://js.paystack.co/v1/inline.js"]'
    )

    const start = Date.now()
    const poll = () => {
      if (isPaystackReady()) {
        resolve(true)
        return
      }
      if (Date.now() - start > timeoutMs) {
        resolve(false)
        return
      }
      setTimeout(poll, 100)
    }

    if (existing) {
      poll()
      return
    }

    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/** Standard "transfer the exact amount" notice shown before the Paystack modal opens. */
export function exactAmountNotice(amount: number): string {
  return `Kindly ensure to transfer exactly ₦${amount.toLocaleString()} to prevent a failed transaction.`
}

/**
 * Registers the payer as a Paystack Customer (email + first/last name +
 * phone) via the backend, BEFORE the checkout widget opens — but only if
 * that email doesn't already have a Paystack customer record. An existing
 * record is left untouched (the backend never overwrites a name once
 * registered, since the same email can legitimately belong to different
 * payers across purchases).
 *
 * Paystack's inline checkout only uses `email` to identify/attach a
 * Customer record — the first_name/last_name/phone keys passed into
 * PaystackPop.setup() are not what populates transaction.customer. Calling
 * this first is what actually gets Paystack to show and store the buyer's
 * real name against that email, instead of leaving customer.first_name /
 * customer.last_name blank on the resulting transaction.
 *
 * Deliberately fire-and-forget: never awaited by the caller, never allowed
 * to block or fail checkout. If it doesn't land in time, the buyer's name
 * is still preserved in metadata.custom_fields as a fallback record.
 */
export function upsertPaystackCustomer(email: string, firstName?: string, lastName?: string, phone?: string): void {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backendUrl || !email) return

  fetch(`${backendUrl}/v1/customer/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, firstName, lastName, phone }),
  }).catch((err) => {
    console.warn("[upsertPaystackCustomer] Non-blocking failure:", err)
  })
}
