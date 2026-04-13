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
}

const LazyImage: React.FC<{
  src: string
  alt: string
  showFullscreenIcon?: boolean
}> = ({ src, alt, showFullscreenIcon = false }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const imgSrc = src || "/placeholder.svg"

  return (
    <>
      {/* aspect-[4/3] keeps single images in the same box as the carousel */}
      <div className="relative w-full aspect-[4/3] bg-white rounded-lg overflow-hidden group">
        {/* Skeleton */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
            <div className="w-16 h-16 bg-gray-300 rounded-full animate-pulse" />
          </div>
        )}

        <img
          src={imgSrc}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => { setHasError(true); setIsLoaded(true) }}
          className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Fullscreen button */}
        {showFullscreenIcon && isLoaded && !hasError && (
          <button
            onClick={() => setShowFullscreen(true)}
            className="absolute top-3 right-3 z-10
              opacity-0 group-hover:opacity-100 transition-all duration-200
              bg-[#6b2fa5] hover:bg-purple-700 text-white p-2 rounded-full shadow-lg"
            aria-label="View fullscreen"
          >
            <Maximize2 size={18} />
          </button>
        )}

        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <span className="text-gray-500 text-sm">Failed to load image</span>
          </div>
        )}
      </div>

      {/* Fullscreen overlay */}
      {showFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4 sm:p-8">
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 bg-white hover:bg-gray-100 text-gray-900 p-3 rounded-full transition-all duration-200 shadow-2xl border border-gray-200"
            style={{ zIndex: 9999 }}
            aria-label="Close fullscreen"
          >
            <X size={24} />
          </button>
          <img
            src={imgSrc}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          />
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
}) => {
  const primaryImage = eventImage || "/placeholder.svg"
  const extraImages = (eventImages ?? []).filter((url) => url && url !== primaryImage)
  const allImages = [primaryImage, ...extraImages]

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {allImages.length > 1 ? (
        <ImageCarousel eventImages={allImages} eventName={eventName} />
      ) : (
        <LazyImage
          src={primaryImage}
          alt={eventName}
          showFullscreenIcon={showFullscreenIcon}
        />
      )}
    </div>
  )
}