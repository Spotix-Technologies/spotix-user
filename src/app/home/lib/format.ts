const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export const eventHref = (eventId: string) => `/event/${eventId}`

function parseDate(value?: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** "Sun, Nov 29" — the year is appended only when it isn't the current one. */
export function formatEventDate(value?: string): string {
  const d = parseDate(value)
  if (!d) return value ?? ""
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
    // Date-only strings parse as UTC midnight; format them in UTC so the
    // day never shifts for visitors west of UTC.
    ...(value && DATE_ONLY.test(value) ? { timeZone: "UTC" } : {}),
  })
}

const pad2 = (n: number) => String(n).padStart(2, "0")

/**
 * Calendar-day key ("2026-11-01") for an event date. Date-only strings are used
 * as-is (no timezone shift); full timestamps are bucketed by the viewer's local day.
 * Returns null when the value isn't a usable date.
 */
export function dayKey(value?: string): string | null {
  if (!value) return null
  if (DATE_ONLY.test(value)) return value
  const d = parseDate(value)
  if (!d) return null
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Today's key in the viewer's local timezone. */
export function todayKey(now: number = Date.now()): string {
  const t = new Date(now)
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`
}

/** "Saturday, November 1, 2026" from a "YYYY-MM-DD" key. */
export function formatDayLong(key: string): string {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Has this event's start already gone by?
 * Date-only values ("2026-09-28") count as past only once that whole day
 * is over, so an event happening today is never demoted mid-day.
 */
export function hasPassed(value?: string, now: number = Date.now()): boolean {
  const d = parseDate(value)
  if (!d) return false
  if (value && DATE_ONLY.test(value)) {
    const t = new Date(now)
    const pad = (n: number) => String(n).padStart(2, "0")
    const today = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`
    return value < today
  }
  return d.getTime() < now
}

/**
 * Cloudinary delivery transform. With a height the image is cropped to fit
 * (auto-gravity); with width only it is just size-limited.
 * Non-Cloudinary URLs are returned untouched.
 */
export function optimizeImage(url: string, width: number, height?: number): string {
  if (!url) return "/placeholder.svg"
  if (!url.includes("cloudinary.com")) return url
  const i = url.indexOf("/upload/")
  if (i === -1) return url
  const transform = height
    ? `c_fill,g_auto,w_${width},h_${height},q_auto,f_auto`
    : `c_limit,w_${width},q_auto,f_auto`
  return `${url.slice(0, i + 8)}${transform}/${url.slice(i + 8)}`
}
