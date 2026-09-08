/**
 * src/lib/paystack/device.ts
 *
 * Detects whether the current browser is running on an Apple device
 * (iPhone/iPad/iPod, or a Mac — including iPadOS 13+, which reports
 * itself as "MacIntel" but exposes multi-touch). Used purely to decide
 * whether the "Apple Pay" payment option is worth showing at all — it's
 * not a real capability check (Paystack's own `.checkout()` does its own
 * device detection when the widget opens, see ticket-payment-utility.ts).
 *
 * Mirrors spotix-vote's src/lib/paystack/device.ts.
 */
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false

  const ua = navigator.userAgent || ""
  // Covers iPhone/iPad/iPod directly, and both real Macs and iPadOS 13+
  // (which masquerades as "Macintosh" in its UA string).
  return /iPhone|iPad|iPod|Macintosh/.test(ua)
}
