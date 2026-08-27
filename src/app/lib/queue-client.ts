// app/lib/queue-client.ts
//
// Thin client for the spotix-backend virtual queue API (see
// spotix-backend/v1/queue.js). No auth required — identity is an opaque
// signed token issued on join and persisted in sessionStorage for the
// lifetime of that checkout attempt, same lifecycle as spotix_payment_data.

export interface QueueJoinResponse {
  success: boolean
  queueToken: string
  position: number
  batchSize: number
}

export interface QueueStatusResponse {
  success: boolean
  status: "waiting" | "admitted" | "expired"
  position?: number
  totalWaiting?: number
  etaSeconds?: number
  etaLabel?: string
  expiresAt?: number
}

export interface QueueConfigResponse {
  enabled: boolean
  batchSize: number
}

function backendUrl(): string | null {
  return process.env.NEXT_PUBLIC_BACKEND_URL || null
}

/** sessionStorage key holding this event's queue token, if the buyer has joined one. */
export function queueTokenStorageKey(eventId: string): string {
  return `spotix_queue_token_${eventId}`
}

/** Whether this event currently has the virtual queue turned on. */
export async function getQueueConfig(eventId: string): Promise<QueueConfigResponse | null> {
  const base = backendUrl()
  if (!base) return null
  try {
    const res = await fetch(`${base}/v1/queue/config?eventId=${encodeURIComponent(eventId)}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    return { enabled: !!data.enabled, batchSize: data.batchSize ?? 50 }
  } catch {
    return null
  }
}

/** Joins the virtual queue for an event. Returns null on any failure — the
 *  caller should fall back to sending the buyer straight to checkout rather
 *  than stranding them on an error screen. */
export async function joinQueue(eventId: string): Promise<QueueJoinResponse | null> {
  const base = backendUrl()
  if (!base) return null
  try {
    const res = await fetch(`${base}/v1/queue/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.success) return null
    return data
  } catch {
    return null
  }
}

/** Polls current queue position / admission status for a held token. */
export async function getQueueStatus(eventId: string, token: string): Promise<QueueStatusResponse | null> {
  const base = backendUrl()
  if (!base) return null
  try {
    const res = await fetch(
      `${base}/v1/queue/status?eventId=${encodeURIComponent(eventId)}&token=${encodeURIComponent(token)}`,
      { cache: "no-store" }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Fire-and-forget — releases a held checkout slot the instant checkout
 * finishes, instead of waiting for the session to expire on its own. Same
 * non-blocking pattern as upsertPaystackCustomer in paystack-shared.ts.
 */
export function releaseQueueSlot(eventId: string, token: string): void {
  const base = backendUrl()
  if (!base || !token) return
  fetch(`${base}/v1/queue/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId, token }),
  }).catch((err) => {
    console.warn("[releaseQueueSlot] Non-blocking failure:", err)
  })
}

/**
 * Fire-and-forget — frees this person's place in line if they navigate
 * away while still waiting, so the position isn't held for nothing.
 * Prefers sendBeacon since it survives page unload better than fetch.
 */
export function leaveQueue(eventId: string, token: string): void {
  const base = backendUrl()
  if (!base || !token) return
  const body = JSON.stringify({ eventId, token })

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" })
    navigator.sendBeacon(`${base}/v1/queue/leave`, blob)
    return
  }

  fetch(`${base}/v1/queue/leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {})
}
