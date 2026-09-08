// components/EventSummaryCard.tsx
"use client"

import { CalendarDays, MapPin } from "lucide-react"

interface EventSummaryCardProps {
  eventName: string
  eventImage: string
  eventDate: string
  eventVenue: string
}

export default function EventSummaryCard({ eventName, eventImage, eventDate, eventVenue }: EventSummaryCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {eventImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={eventImage} alt={eventName} className="w-full h-40 lg:h-48 object-cover" />
      )}
      <div className="p-5">
        <h1 className="text-lg font-bold text-gray-900">{eventName}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" /> {eventDate}
          </span>
          {eventVenue && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> {eventVenue}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
