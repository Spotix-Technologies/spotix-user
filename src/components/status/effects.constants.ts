/**
 * Tuning knobs for the react-halloween effects (DoomFire / Haunted / LightsOut).
 * Which ones are *on* is decided by env vars — see ./config.ts.
 */

export const DOOM_FIRE = {
  /** Fire strip height in px (desktop / mobile). */
  height: 150,
  heightMobile: 90,
  /** Bigger = chunkier pixels = far fewer pixels to simulate (cheaper). */
  pixelSize: 4,
  pixelSizeMobile: 6,
  /** 0–1. Lower keeps the flames low so they never cover content. */
  fireStrength: 0.6,
  zIndex: 9988,
  /** Below this viewport width we use the mobile numbers above. */
  mobileBreakpoint: 640,
} as const

export const GHOSTS = {
  /** Where the haunted orb sits (px from the viewport edges). */
  left: 20,
  bottom: 96,
  size: 56,
  zIndex: 9991,
  creatureOptions: {
    numberOf: 5,
    distance: 180,
    animationTime: 1.6,
    dimensions: { width: 40, height: 40 },
  },
  glowOptions: {
    animationTime: 3,
    boxShadowOn: "0px 0px 34px rgba(168, 85, 247, 0.95)",
    boxShadowOff: "0px 0px 0px rgba(168, 85, 247, 0)",
  },
} as const

export const LIGHTS_OUT = {
  /** Spotlight diameter in px. */
  size: 280,
  /** Slightly lighter than the 0.9 default so the site stays usable. */
  darkColor: "rgba(0, 0, 0, 0.88)",
  /** Library default; sits above everything else. */
  zIndex: 100000,
} as const
