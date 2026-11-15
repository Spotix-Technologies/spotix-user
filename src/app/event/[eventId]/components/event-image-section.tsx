"use client"

import type React from "react"
import { useState } from "react"
import { X, Maximize2 } from "lucide-react"
import { ImageCarousel } from "./image-carousel"

interface EventImageSectionProps {
  eventImages?: string[]
  eventName: string
  eventImage: string
  showFullscreenIcon?: boolean
  /** Optional: fires with the URL of the image currently showing (carousel case). */
  onActiveImageChange?: (url: string) => void
  /** Tailwind aspect-ratio classes for the frame (default: portrait on mobile, 4:3 from sm). */
  aspectClass?: string
}

const DEFAULT_ASPECT = "aspect-[4/5] sm:aspect-[4/3]"

const SingleImage: React.FC<{ src: string; alt: string; showFullscreenIcon?: boolean; aspectClass?: string }> = ({
  src,
  alt,
  showFullscreenIcon = false,
  aspectClass = DEFAULT_ASPECT,
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)

  return (
    <>
      <div className={`relative w-full overflow-hidden rounded-3xl bg-neutral-100 ${aspectClass}`}>
        {!isLoaded && !hasError && <div className="absolute inset-0 animate-pulse bg-neutral-200" />}

        <img
          src={src}
          alt={alt}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true)
            setIsLoaded(true)
          }}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
            isLoaded && !hasError ? "opacity-100" : "opacity-0"
          }`}
        />

        {showFullscreenIcon && isLoaded && !hasError && (
          <button
            onClick={() => setShowFullscreen(true)}
            className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white text-gray-800 transition hover:bg-gray-50"
            aria-label="View fullscreen"
          >
            <Maximize2 size={16} />
          </button>
        )}

        {hasError && (
          <div className="absolute inset-0 grid place-items-center text-sm text-gray-500">Failed to load image</div>
        )}
      </div>

      {showFullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 sm:p-8"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute right-4 top-4 z-[9999] grid h-11 w-11 place-items-center rounded-full bg-white text-gray-900 transition hover:bg-gray-100"
            aria-label="Close fullscreen"
          >
            <X size={22} />
          </button>
          <img src={src} alt={alt} className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        </div>
      )}
    </>
  )
}

export const EventImageSection: React.FC<EventImageSectionProps> = ({
  eventImages,
  eventName,
  eventImage,
  showFullscreenIcon = true,
  onActiveImageChange,
  aspectClass = DEFAULT_ASPECT,
}) => {
  const primaryImage = eventImage || "/placeholder.svg"
  const extraImages = (eventImages ?? []).filter((url) => url && url !== primaryImage)
  const allImages = [primaryImage, ...extraImages]

  return allImages.length > 1 ? (
    <ImageCarousel
      eventImages={allImages}
      eventName={eventName}
      onActiveImageChange={onActiveImageChange}
      aspectClass={aspectClass}
    />
  ) : (
    <SingleImage src={primaryImage} alt={eventName} showFullscreenIcon={showFullscreenIcon} aspectClass={aspectClass} />
  )
}
