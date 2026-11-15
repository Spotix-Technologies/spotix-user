/**
 * Tunables for the scroll-expand hero. Change a value here and the hook follows.
 */

// Scroll → progress sensitivity
export const WHEEL_SENSITIVITY = 0.0009
export const TOUCH_SENSITIVITY_UP = 0.005
export const TOUCH_SENSITIVITY_BACK = 0.008

// Collapse the hero again when the user scrolls up from the very top
export const COLLAPSE_TOP_THRESHOLD = 5 // px of scrollY still counted as "at the top"
export const TOUCH_COLLAPSE_THRESHOLD = 20 // px of upward swipe needed on touch
export const COLLAPSE_NUDGE = 0.97 // progress to fall back to on collapse (visibly re-closes the card)

// Page scrolling stays locked until the expansion is painted AND the gesture that
// finished it has ended (trackpad inertia would otherwise carry straight into the page).
export const SETTLE_MS = 160 // minimum wait after the final frame
export const WHEEL_IDLE_MS = 120 // wheel stream must be silent this long before unlocking

// Nav anchor links scroll to their section after the hero finishes; fixed navbar is h-20
export const NAV_OFFSET = 80

export const MOBILE_BREAKPOINT = 768

// Elements that should freeze / pause the hero
export const HOLD_SELECTOR = "[data-hero-hold]" // e.g. the full-screen preloader
export const MODAL_SELECTOR = '[aria-modal="true"]' // e.g. the discovery dialog

export const EXPAND_KEYS = [" ", "ArrowDown", "PageDown", "End"]
