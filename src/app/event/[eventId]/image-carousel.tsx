"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Maximize2, X, ChevronLeft, ChevronRight } from "lucide-react"

interface ImageCarouselProps {
  images: string[]
  eventName: string
}

export function ImageCarousel({ images, eventName }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasMultipleImages = images.length > 1

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    setIsLoaded(false)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
    setIsLoaded(false)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hasMultipleImages) return
    setIsDragging(true)
    setDragStart(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !hasMultipleImages) return
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return
    setIsDragging(false)

    const dragEnd = e.clientX
    const dragDistance = dragStart - dragEnd

    if (Math.abs(dragDistance) > 50) {
      if (dragDistance > 0) {
        handleNext()
      } else {
        handlePrevious()
      }
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!hasMultipleImages) return
    setIsDragging(true)
    setDragStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return
    setIsDragging(false)

    const dragEnd = e.changedTouches[0].clientX
    const dragDistance = dragStart - dragEnd

    if (Math.abs(dragDistance) > 50) {
      if (dragDistance > 0) {
        handleNext()
      } else {
        handlePrevious()
      }
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full h-64 md:h-80 mb-8 rounded-lg overflow-hidden shadow-lg group bg-gray-100 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Image */}
        <div className="w-full h-full relative">
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <div className="w-16 h-16 bg-gray-300 rounded-full animate-pulse"></div>
            </div>
          )}
          <img
            src={images[currentIndex] || "/placeholder.svg"}
            alt={`${eventName} - Image ${currentIndex + 1}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true)
              setIsLoaded(true)
            }}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
          />

          {hasError && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <span className="text-gray-500">Failed to load image</span>
            </div>
          )}
        </div>

        {/* Fullscreen Button */}
        {isLoaded && !hasError && (
          <button
            onClick={() => setShowFullscreen(true)}
            className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full transition-all duration-200 hover:bg-opacity-70 z-10 hover:scale-110"
            aria-label="View fullscreen"
          >
            <Maximize2 size={20} />
          </button>
        )}

        {/* Navigation Arrows - Only show if multiple images */}
        {hasMultipleImages && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full transition-all duration-200 hover:bg-opacity-70 hover:scale-110 z-10"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full transition-all duration-200 hover:bg-opacity-70 hover:scale-110 z-10"
              aria-label="Next image"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Scroll Indicators - Only show if multiple images */}
        {hasMultipleImages && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index)
                  setIsLoaded(false)
                }}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? "w-2 h-2 bg-[#6b2fa5]"
                    : "w-1.5 h-1.5 bg-white bg-opacity-60 hover:bg-opacity-100"
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
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
              src={images[currentIndex] || "/placeholder.svg"}
              alt={`${eventName} - Image ${currentIndex + 1}`}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  )
}