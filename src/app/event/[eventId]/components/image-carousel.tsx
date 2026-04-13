'use client'

import type React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageCarouselProps {
  eventImages: string[]
  eventName: string
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ eventImages, eventName }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayIndex, setDisplayIndex] = useState(0)
  const [fading, setFading] = useState(false)

  if (!eventImages || eventImages.length === 0) return null

  const FADE_DURATION = 350 // ms — must match the CSS transition below

  // Cross-fade: hide current → swap src → show next
  const transitionTo = useCallback(
    (nextIndex: number) => {
      if (fading || nextIndex === currentIndex) return
      setFading(true)
      setTimeout(() => {
        setDisplayIndex(nextIndex)
        setCurrentIndex(nextIndex)
        setFading(false)
      }, FADE_DURATION)
    },
    [fading, currentIndex]
  )

  const goToPrevious = () =>
    transitionTo(currentIndex === 0 ? eventImages.length - 1 : currentIndex - 1)

  const goToNext = () =>
    transitionTo(currentIndex === eventImages.length - 1 ? 0 : currentIndex + 1)

  const goToSlide = (index: number) => transitionTo(index)

  return (
    <div
      // aspect-[4/3] gives a consistent 4:3 box on all screens.
      // Images use object-contain so nothing is cropped — letterbox bars
      // use the same bg-gray-950 as the container so they're invisible.
      className="relative w-full aspect-[4/3] bg-white rounded-lg overflow-hidden group"
    >
      {/* Image — fades on transition */}
      <img
        key={displayIndex}
        src={eventImages[displayIndex] || '/placeholder.svg'}
        alt={`${eventName} — image ${displayIndex + 1}`}
        className="absolute inset-0 w-full h-full object-contain transition-opacity"
        style={{
          opacity: fading ? 0 : 1,
          transitionDuration: `${FADE_DURATION}ms`,
          transitionTimingFunction: 'ease-in-out',
        }}
      />

      {/* Navigation — only when multiple images */}
      {eventImages.length > 1 && (
        <>
          {/* Prev arrow */}
          <button
            onClick={goToPrevious}
            disabled={fading}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10
              transition-all duration-200
              bg-[#6b2fa5] hover:bg-purple-700 disabled:opacity-40
              text-white p-2.5 rounded-full shadow-lg"
            aria-label="Previous image"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>

          {/* Next arrow */}
          <button
            onClick={goToNext}
            disabled={fading}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10
              transition-all duration-200
              bg-[#6b2fa5] hover:bg-purple-700 disabled:opacity-40
              text-white p-2.5 rounded-full shadow-lg"
            aria-label="Next image"
          >
            <ChevronRight size={22} strokeWidth={2.5} />
          </button>

          {/* Counter badge */}
          <div className="absolute top-3 right-3 z-10 bg-[#6b2fa5] bg-opacity-80 text-white px-3 py-1 rounded-full text-xs font-semibold tracking-wide">
            {currentIndex + 1} / {eventImages.length}
          </div>

          {/* Dot indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
            {eventImages.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                disabled={fading}
                aria-label={`Go to image ${index + 1}`}
                className="h-2 rounded-full transition-all duration-300 disabled:cursor-default"
                style={{
                  width: index === currentIndex ? '24px' : '8px',
                  background: index === currentIndex
                    ? '#6b2fa5'
                    : 'rgba(107, 47, 165, 0.35)',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}