"use client"

import type React from "react"
import { MapPin } from "lucide-react"

interface LocationSectionProps {
  eventVenue: string
  eventName: string
}

const LocationSection: React.FC<LocationSectionProps> = ({ eventVenue, eventName }) => {
  const handleOpenMaps = () => {
    const encodedVenue = encodeURIComponent(eventVenue)
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedVenue}`
    window.open(mapsUrl, "_blank")
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-center gap-3 mb-4">
        <MapPin size={24} className="text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-800">Event Location</h2>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-gray-800 mb-2">Venue</h3>
        <p className="text-lg text-gray-600 mb-4">{eventVenue}</p>

        <button
          onClick={handleOpenMaps}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <MapPin size={16} />
          Open in Maps
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          <strong>Note:</strong> Please arrive at the venue on time. Check the event details for specific timing
          information.
        </p>
      </div>
    </div>
  )
}

export default LocationSection
