/**
 * lib/nomination-config.ts
 *
 * Configuration for open-nomination polls — a separate flow from
 * lib/poll-config.ts. In a nomination poll the organiser only sets a
 * name/image/description + a flat list of categories. The public then
 * nominates candidates into each category (see spotix-user
 * /polls/nominate/[pollId]). Each category has its own independent
 * nominee pool — nomination categories are NOT nested (no subcategories),
 * unlike voting-poll categories.
 */

/** Max categories an organiser can open for a single nomination poll. */
export const MAX_NOMINATION_CATEGORIES = 20

/** Max length (chars) of a nominated name, post-trim. */
export const MAX_NOMINEE_NAME_LENGTH = 60

/** Min length (chars) of a nominated name, post-trim. */
export const MIN_NOMINEE_NAME_LENGTH = 2

export interface NominationCategory {
  categoryId: string
  name: string
}

export function genNominationCategoryId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let id = "sp-nomcat-"
  for (let i = 0; i < 10; i++) id += chars.charAt(Math.floor(Math.random() * chars.length))
  return id
}

/**
 * Normalises a nominated name for de-duplication: trimmed, lowercased,
 * internal whitespace collapsed. The normalised form is used as (part of)
 * the Firestore doc id and as the uniqueness key — re-nominating the same
 * name (any casing/spacing) just increments the existing nominee's count.
 */
export function normalizeNomineeName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Builds a Firestore-safe doc id from a category + normalised name.
 * Firestore doc ids can't contain "/" and shouldn't rely on arbitrary
 * unicode edge cases, so we slugify.
 */
export function nomineeDocId(categoryId: string, normalizedName: string): string {
  const slug = normalizedName.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "nominee"
  return `${categoryId}__${slug}`
}
