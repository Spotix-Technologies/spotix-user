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

/** Reusable gradient strings so every section shares the same ramps */
export const GRADIENTS = {
  brand: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
  brandDeep: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primaryDarker} 100%)`,
  brandRadialDark: `radial-gradient(ellipse 80% 80% at 50% 0%, rgba(107,47,165,0.35) 0%, transparent 70%)`,
}
