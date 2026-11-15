/**
 * Date/time helpers for the event page (hero, countdown, calendar link).
 *
 * Event dates are stored as strings ("YYYY-MM-DD" or ISO) and times as 24h "HH:mm".
 * A bare "YYYY-MM-DD" is built as a LOCAL date — `new Date("2026-11-28")` would be
 * parsed as UTC midnight and can land on the previous day for some timezones.
 */

interface StartFields {
  eventDate: string
  eventStart?: string
}
interface EndFields extends StartFields {
  eventEndDate?: string
  eventEnd?: string
}

export function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  const d = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function withTime(base: Date, time?: string | null, fallback: [number, number] = [0, 0]): Date {
  const d = new Date(base)
  const m = time ? /^(\d{1,2}):(\d{2})/.exec(time) : null
  if (m) d.setHours(Number(m[1]), Number(m[2]), 0, 0)
  else d.setHours(fallback[0], fallback[1], 0, 0)
  return d
}

export function getEventStart(e: StartFields): Date | null {
  const base = parseLocalDate(e.eventDate)
  return base ? withTime(base, e.eventStart) : null
}

export function getEventEnd(e: EndFields): Date | null {
  const base = parseLocalDate(e.eventEndDate) ?? parseLocalDate(e.eventDate)
  if (!base) return null
  // No end time given → treat the event as running to the end of that day
  let end = withTime(base, e.eventEnd, [23, 59])
  const start = getEventStart(e)
  // Overnight event with no explicit end date (e.g. 22:00 → 04:00)
  if (start && end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  return end
}

/** "20:00" → "8:00 PM" (returns the input untouched if it isn't HH:mm) */
export function formatTime12(time?: string | null): string {
  const m = time ? /^(\d{1,2}):(\d{2})/.exec(time) : null
  if (!m) return time ?? ""
  const h = Number(m[1])
  const suffix = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${m[2]} ${suffix}`
}

/** "SAT · NOV 28" */
export function formatShortDate(d: Date): string {
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" })
  const month = d.toLocaleDateString("en-US", { month: "short" })
  return `${weekday} · ${month} ${d.getDate()}`.toUpperCase()
}

export function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
}

const pad = (n: number) => String(n).padStart(2, "0")
const calStamp = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`

/** Opens a pre-filled "new event" screen in Google Calendar (times are floating/local). */
export function buildGoogleCalendarUrl(opts: {
  title: string
  start: Date
  end: Date | null
  location?: string
  details?: string
}): string {
  const end = opts.end ?? new Date(opts.start.getTime() + 3 * 60 * 60 * 1000)
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${calStamp(opts.start)}/${calStamp(end)}`,
  })
  if (opts.location) params.set("location", opts.location)
  if (opts.details) params.set("details", opts.details)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
