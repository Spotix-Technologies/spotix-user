/**
 * src/app/lib/reference-id.ts
 *
 * Shared payment-reference generators for ticket and voting purchases.
 *
 * References were previously minted as `SPTX-REF-{Date.now()}` /
 * `sptx-vt-{Date.now()}` — two requests landing in the same millisecond
 * (entirely possible under concurrent checkout traffic, e.g. a popular
 * event's ticket sale or a close poll near its deadline) would collide on
 * the same Firestore doc ID in the `Reference` collection, silently
 * overwriting one buyer's payment record with another's.
 *
 * Appending 2 random letters after the timestamp all but eliminates that:
 * a collision now needs the same millisecond AND the same 2-letter draw
 * (1-in-676 given a same-millisecond hit, which is already rare).
 *
 * Backend shape validation (spotix-backend/v1/lib/reference-format.js)
 * accepts both the old (no suffix) and new (with suffix) shapes, so
 * historical references already in Firestore keep working.
 */

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/**
 * Cryptographically-random N-letter suffix (uppercase). Falls back to
 * Math.random in non-crypto environments — collision-avoidance doesn't
 * need to be unpredictable, just varied.
 */
function randomLetters(length = 2): string {
  let out = ""
  const cryptoObj: Crypto | undefined = typeof globalThis !== "undefined" ? globalThis.crypto : undefined

  for (let i = 0; i < length; i++) {
    let idx: number
    if (cryptoObj?.getRandomValues) {
      const arr = new Uint32Array(1)
      cryptoObj.getRandomValues(arr)
      idx = arr[0] % ALPHA.length
    } else {
      idx = Math.floor(Math.random() * ALPHA.length)
    }
    out += ALPHA[idx]
  }
  return out
}

/** Builds a ticket/booking payment reference: SPTX-REF-{timestamp}-{AA} */
export function buildTicketReference(timestamp: number = Date.now()): string {
  return `SPTX-REF-${timestamp}-${randomLetters(2)}`
}

/** Builds a voting-purchase payment reference: sptx-vt-{timestamp}-{aa} */
export function buildVoteReference(timestamp: number = Date.now()): string {
  return `sptx-vt-${timestamp}-${randomLetters(2).toLowerCase()}`
}
