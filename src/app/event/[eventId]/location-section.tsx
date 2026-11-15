"use client"

import React, { useState } from "react"
import { Check, Copy, Navigation } from "lucide-react"
import { Reveal } from "./components/reveal"
import { SectionHeading } from "./components/section-heading"

interface LocationSectionProps {
  eventVenue: string
  eventName: string
}

const LocationSection: React.FC<LocationSectionProps> = ({ eventVenue, eventName }) => {
  const [copied, setCopied] = useState(false)

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(eventVenue)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }

  if (!eventVenue) {
    return null
  }

  return (
    <section id="location" className="scroll-mt-32">
      <Reveal>
        <SectionHeading kicker="Find the spot" title="Where the" accent="magic starts." />
      </Reveal>

      <Reveal className="mt-10">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-100 shadow-sm">
          <div className="relative h-[22rem] w-full sm:h-[30rem]">
            <iframe
              src={getMapEmbedUrl(eventVenue)}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map of ${eventName || eventVenue}`}
              className="h-full w-full"
            />

            {/* Get Directions — overlaid on the map */}
            <button
              type="button"
              onClick={handleGetDirections}
              className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-[#171123] shadow-lg backdrop-blur-md transition-colors hover:bg-white"
            >
              <Navigation size={16} className="text-[#6b2fa5]" />
              Get Directions
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <p className="text-lg font-medium text-[#171123] sm:text-xl">{eventVenue}</p>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy address"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-[#171123] hover:text-[#171123]"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </Reveal>
    </section>
  )
}

export default LocationSection
