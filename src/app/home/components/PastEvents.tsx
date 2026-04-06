"use client"

import React from "react"
import { Calendar, MapPin, History } from "lucide-react"

interface HomeEvent {
  eventId: string
  eventName: string
  venue: string
  eventType: string
  eventStartDate: string
  freeOrPaid: boolean
  eventImage: string
}

interface PastEventsProps {
  events: HomeEvent[]
  loading: boolean
  onEventClick: (eventId: string) => void
}

const LazyImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)

  const getOptimizedImageUrl = (url: string): string => {
    if (!url) return "/placeholder.svg"
    if (url.includes("cloudinary.com")) {
      const uploadIndex = url.indexOf("/upload/")
      if (uploadIndex !== -1) {
        const before = url.substring(0, uploadIndex + 8)
        const after = url.substring(uploadIndex + 8)
        return `${before}c_fill,w_800,h_600,q_auto,f_auto/${after}`
      }
    }
    return url
  }

  return (
    <div className={`relative ${className || ""}`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse" />
      )}
      <img
        src={getOptimizedImageUrl(src)}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => { setHasError(true); setIsLoaded(true) }}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
      />
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
          <span className="text-4xl">📅</span>
        </div>
      )}
    </div>
  )
}

const EventCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-200" />
    <div className="p-4 space-y-3">
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
    </div>
  </div>
)

const PastEventCard: React.FC<{ event: HomeEvent; onClick: () => void }> = ({ event, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-gray-400 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 opacity-90"
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <LazyImage
          src={event.eventImage || "/placeholder.svg"}
          alt={event.eventName}
          className="w-full h-full grayscale-[30%] group-hover:grayscale-0 transition-all duration-300"
        />

        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white shadow-lg ${!event.freeOrPaid ? "bg-green-500" : "bg-blue-500"}`}>
            {!event.freeOrPaid ? "Free" : "Paid"}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-500 text-white shadow-lg">
            Past
          </span>
        </div>

        <div className="absolute top-3 right-3">
          <div className="bg-white rounded-lg shadow-lg p-2 text-center min-w-[60px]">
            <div className="text-xs font-semibold uppercase text-gray-500">
              {new Date(event.eventStartDate).toLocaleDateString("en-US", { month: "short" })}
            </div>
            <div className="text-2xl font-bold text-gray-700">{new Date(event.eventStartDate).getDate()}</div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-800 group-hover:text-gray-900 transition-colors line-clamp-2 mb-3">
          {event.eventName}
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
              <Calendar size={12} className="text-gray-500" />
            </div>
            <span className="truncate font-medium">{event.eventType}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
              <MapPin size={12} className="text-gray-500" />
            </div>
            <span className="truncate font-medium">{event.venue}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const PastEvents: React.FC<PastEventsProps> = ({ events, loading, onEventClick }) => {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800">Past Events</h2>
          <History size={28} className="text-gray-500" />
        </div>
        <p className="text-gray-600 text-sm sm:text-base">Check out our previous events</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)
        ) : events.length > 0 ? (
          events.map((event, index) => (
            <PastEventCard
              key={event.eventId || `past-${index}`}
              event={event}
              onClick={() => onEventClick(event.eventId)}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-lg">No past events found.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default PastEvents