"use client"

import type React from "react"
import { useState } from "react"
import { X, Maximize2 } from "lucide-react"
import { ImageCarousel } from "../image-carousel"

interface EventImageSectionProps {
  images?: string[]
  eventName: string
  eventImage: string
  showFullscreenIcon?: boolean
}

const LazyImage: React.FC<{
  src: string
  alt: string
  className?: string
  showFullscreenIcon?: boolean
}> = ({ src, alt, className, showFullscreenIcon = false }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const imgSrc = src || "/placeholder.svg"

  return (
    <>
      <div className={`relative group ${className || ""}`}>
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
            <div className="w-16 h-16 bg-gray-300 rounded-full animate-pulse" />
          </div>
        )}
        <img
          src={imgSrc}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => { setHasError(true); setIsLoaded(true) }}
          className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"
            }`}
        />
        {showFullscreenIcon && isLoaded && !hasError && (
          <button
            onClick={() => setShowFullscreen(true)}
            className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full transition-all duration-200 hover:bg-opacity-70 hover:scale-110"
            aria-label="View fullscreen"
          >
            <Maximize2 size={20} />
          </button>
        )}
        {hasError && (
          <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">Failed to load image</span>
          </div>
        )}
      </div>

      {showFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50">
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-1/2 -translate-y-1/2 right-4 bg-white hover:bg-gray-100 text-gray-900 p-4 rounded-full transition-all duration-200 shadow-2xl border-2 border-gray-200"
            style={{ zIndex: 9999 }}
            aria-label="Close fullscreen"
          >
            <X size={28} />
          </button>
          <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
            <img
              src={imgSrc}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  )
}

export const EventImageSection: React.FC<EventImageSectionProps> = ({
  images,
  eventName,
  eventImage,
  showFullscreenIcon = true,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {images && images.length > 1 ? (
        <ImageCarousel images={images} eventName={eventName} />
      ) : (
        <LazyImage
          src={eventImage || "/placeholder.svg"}
          alt={eventName}
          className="w-full h-[300px] sm:h-[400px] lg:h-[500px]"
          showFullscreenIcon={showFullscreenIcon}
        />
      )}
    </div>
  )
}
