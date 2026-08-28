// app/event/[eventId]/payment/lib/url-ref.ts

import { REF_QUERY_PARAM } from "../constants"

/** Minimal shape we need from Next's app-router `useRouter()` return value. */
export interface UrlRefRouter {
  replace: (href: string, options?: { scroll?: boolean }) => void
}

/**
 * Stamps `?ref={reference}` onto the current URL without a navigation or
 * scroll reset, so a mid-payment refresh (or the tab being discarded and
 * reloaded while the buyer is away completing a bank transfer/USSD
 * payment) has something to recover from — see lib/payment-status.ts.
 */
export function setRefInUrl(router: UrlRefRouter, reference: string): void {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  url.searchParams.set(REF_QUERY_PARAM, reference)
  router.replace(`${url.pathname}${url.search}`, { scroll: false })
}

/**
 * Strips `?ref=` from the URL — used once a reference resolves to a dead
 * end (failed) or turns out unrecoverable, so a further refresh doesn't
 * loop back into the same state.
 */
export function clearRefFromUrl(router: UrlRefRouter): void {
  if (typeof window === "undefined") return
  const url = new URL(window.location.href)
  if (!url.searchParams.has(REF_QUERY_PARAM)) return
  url.searchParams.delete(REF_QUERY_PARAM)
  router.replace(`${url.pathname}${url.search}`, { scroll: false })
}
