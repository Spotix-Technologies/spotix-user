/**
 * theme.ts — Landing page design tokens.
 *
 * Single source of truth for the brand color system so every landing
 * section reads as one cohesive product instead of a patchwork of
 * unrelated gradients. Everything on the page derives from the brand
 * purple (#6b2fa5) plus one warm accent used sparingly for emphasis.
 */

export const BRAND = {
  // Core brand purple
  primary: "#6b2fa5",
  primaryDark: "#4c2178",
  primaryDarker: "#2e1449",
  primaryLight: "#8b4fc7",
  // Light purple for text/accents sitting on the dark ink panels (primary is too dark there)
  primaryOnDark: "#c4a0ee",

  // Tint used for soft surfaces / hover backgrounds
  tint: "#f5f0fb",
  tintBorder: "#e4d6f5",

  // Single warm accent — used sparingly for highlights, ticket/CTA emphasis
  accent: "#2e8ae0",
  accentDark: "#6b0fff",

  // Semantic (status only — not decorative)
  success: "#16a34a",
  successBg: "#dcfce7",

  // Neutrals
  ink: "#171123",
  slate: "#4b4257",
  slateLight: "#7c7389",
  surface: "#faf9fb",
  border: "#ece7f1",
} as const

/**
 * Shared class strings for the clean, light landing layout:
 * white page, soft grey bands, near-black ink, purple used only as the accent.
 * Change a value here and every section follows.
 */
export const UI = {
  /** Page-width wrapper used by every section */
  container: "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8",

  /** Section backgrounds — alternate these down the page */
  bandWhite: "bg-white",
  bandGrey: "bg-[#f7f6f9]",

  /** Typography */
  eyebrow: "text-xs font-semibold uppercase tracking-[0.18em] text-[#6b2fa5]",
  h2: "text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#171123] text-balance",
  lead: "text-base sm:text-lg leading-relaxed text-[#6b6478]",

  /** Buttons — ink pill with a purple hover, and a quiet outline pill */
  btnPrimary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-[#171123] px-7 py-3.5 text-sm sm:text-base font-semibold text-white transition-colors duration-200 hover:bg-[#6b2fa5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b2fa5]",
  btnOutline:
    "inline-flex items-center justify-center gap-2 rounded-full border border-[#d9d4e0] bg-white px-7 py-3.5 text-sm sm:text-base font-semibold text-[#171123] transition-colors duration-200 hover:border-[#171123] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b2fa5]",

  /** Surfaces */
  card: "rounded-2xl border border-[#ece7f1] bg-white",
  pill: "inline-flex items-center gap-2 rounded-full border border-[#ece7f1] bg-white px-4 py-2 text-sm font-medium text-[#4b4257]",
} as const

/** Reusable gradient strings so every section shares the same ramps */
export const GRADIENTS = {
  brand: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
  brandDeep: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primaryDarker} 100%)`,
  brandRadialDark: `radial-gradient(ellipse 80% 80% at 50% 0%, rgba(107,47,165,0.35) 0%, transparent 70%)`,
}
