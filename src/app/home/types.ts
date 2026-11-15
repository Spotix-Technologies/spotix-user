/**
 * NOTE on `freeOrPaid`: the name is historical and inverted —
 * `true` means the event is PAID, `false` means FREE.
 */
export interface HomeEvent {
  eventId: string
  eventName: string
  venue: string
  eventType: string
  eventStartDate: string
  /** Raw start-time string as stored on the event, when the API provides it. */
  eventStart?: string
  freeOrPaid: boolean
  eventImage: string
}

export interface EventCollection {
  collectionId: string
  collectionName: string
  creatorId: string
  eventImage: string
}

export interface HomeData {
  events: {
    today: HomeEvent[]
    upcoming: HomeEvent[]
    past: HomeEvent[]
  }
  collections: EventCollection[]
}

export interface FeaturedEvent {
  id: string
  eventName: string
  imageURL: string
  eventType: string
  venue: string
  eventStartDate: string
  freeOrPaid: boolean
  creatorID: string
  eventId: string
  bookerName: string
}

export type PriceFilter = "free" | "paid" | null

/** One calendar month of events from /api/v1/home/calendar. */
export interface CalendarMonthData {
  /** "YYYY-MM" */
  month: string
  events: HomeEvent[]
  /** True when the month had more events than the API's cap and the list was cut off. */
  truncated: boolean
}
