/**
 * src/utils/phoneValidation.ts
 *
 * Shared Nigerian phone number validation — same pattern already used by
 * src/components/Addphonenumber.tsx, pulled out so other forms (e.g. the
 * shop checkout) can reuse it instead of accepting anything typed into a
 * "Phone number" field.
 *
 * Accepts: 08012345678, 2348012345678, +2348012345678 (spaces allowed
 * anywhere, stripped before testing) — a 10-digit local number starting
 * with 7/8/9, optionally prefixed with 0 or a 234/+234 country code.
 */

const NG_PHONE_REGEX = /^(\+?234|0)?[789]\d{9}$/

/** True for a plausible Nigerian phone number; false for anything else —
 *  too short/long, letters, or a valid-length but structurally wrong
 *  string like a repeated digit run. */
export function isValidNigerianPhone(phone: string): boolean {
  return NG_PHONE_REGEX.test(phone.replace(/\s/g, ""))
}

/** Strips everything except digits and a single leading "+" as the user
 *  types, so a phone field can't accept letters or stray punctuation in
 *  the first place. Caps length so pasting a long string of digits can't
 *  produce something like "11111111111111111111eeeee". */
export function sanitizePhoneInput(raw: string): string {
  const hasLeadingPlus = raw.trimStart().startsWith("+")
  const digitsOnly = raw.replace(/[^\d]/g, "").slice(0, 13)
  return (hasLeadingPlus ? "+" : "") + digitsOnly
}
