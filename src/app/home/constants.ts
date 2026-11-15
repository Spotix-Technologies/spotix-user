export const BRAND = "#6b2fa5"

/** localStorage key for the "Calendar view" setting ("1" = on). */
export const CALENDAR_VIEW_STORAGE_KEY = "spotix_home_calendar_view"

export const HOME_API = "/api/v1/home"
export const CALENDAR_API = "/api/v1/home/calendar"
export const MARK_PAST_API = "/api/v1/home/mark-past"

/** Featured banner auto-advance. */
export const FEATURED_AUTOPLAY_MS = 6000
/** Max featured events pulled from Firestore (same as the landing page). */
export const FEATURED_LIMIT = 5

/** Rows per page in each list section. */
export const PAGE_SIZE = {
  today: 6,
  upcoming: 6,
  past: 4,
} as const

/** Max category tabs shown in the filter bar (most common first). */
export const MAX_CATEGORY_TABS = 8

/** Cache windows (ms) for client-side data. */
export const HOME_DEDUPE_MS = 60 * 1000
/** Calendar months are cached server-side for 5 min; match it on the client. */
export const CALENDAR_DEDUPE_MS = 5 * 60 * 1000
export const FEATURED_DEDUPE_MS = 10 * 60 * 1000
