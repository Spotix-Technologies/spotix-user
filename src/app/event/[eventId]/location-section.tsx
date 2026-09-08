"use client"

import React from "react"
import { MapPin, Navigation } from "lucide-react"

interface LocationSectionProps {
  eventVenue: string
  eventName: string
}

const LocationSection: React.FC<LocationSectionProps> = ({ eventVenue, eventName }) => {
  const getMapEmbedUrl = (venue: string) => {
    const encodedVenue = encodeURIComponent(venue)
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyCt1265A4qvZy9HKUeA8J15AOC4SrCyZe4&q=${encodedVenue}`
  }

  // Builds and opens the URL synchronously, right on the click — no
  // geolocation lookup on our side. That avoids a bug where opening a
  // blank tab first (to dodge popup blockers) backgrounds this Spotix tab,
  // which then throttles the async getCurrentPosition() call until the
  // user clicks back onto it. Google's own directions page can resolve
  // "your location" itself once it loads, with no async gap here at all.
  const handleGetDirections = () => {
    const destination = encodeURIComponent(eventVenue)
    const url = new URL("https://www.google.com/maps/dir/")
    url.searchParams.set("api", "1")
    url.searchParams.set("destination", destination)
    window.open(url.toString(), "_blank", "noopener,noreferrer")
  }

  if (!eventVenue) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-purple-100">
      {/* Location Header */}
      <div className="p-6 lg:p-8 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 rounded-full">
            <MapPin size={24} className="text-[#6b2fa5]" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Location</h3>
        </div>
        <p className="text-lg text-gray-700 font-medium ml-14">{eventVenue}</p>
      </div>

      {/* Map Embed */}
      <div className="relative w-full h-96 bg-gray-200">
        <iframe
          src={getMapEmbedUrl(eventVenue)}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map of ${eventName}`}
          className="w-full h-full"
        />

        {/* Get Directions — overlaid on the map */}
        <button
          onClick={handleGetDirections}
          className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold px-4 py-2.5 rounded-lg shadow-lg border border-gray-200 transition-colors"
        >
          <Navigation size={16} className="text-[#6b2fa5]" />
          Get Directions
        </button>
      </div>
    </div>
  )
}

export default LocationSection
