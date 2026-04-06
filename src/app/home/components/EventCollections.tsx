"use client"

import React from "react"
import { Layers } from "lucide-react"

interface EventCollection {
  collectionId: string
  collectionName: string
  creatorId: string
  eventImage: string
}

interface EventCollectionsProps {
  collections: EventCollection[]
  loading: boolean
  onCollectionClick: (collectionId: string) => void
}

// Lazy Image Component
const LazyImage: React.FC<{
  src: string
  alt: string
  className?: string
}> = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)

  const getOptimizedImageUrl = (url: string): string => {
    if (!url) return "/placeholder.svg"
    if (url.includes("cloudinary.com")) {
      const uploadIndex = url.indexOf("/upload/")
      if (uploadIndex !== -1) {
        const beforeUpload = url.substring(0, uploadIndex + 8)
        const afterUpload = url.substring(uploadIndex + 8)
        return `${beforeUpload}c_fill,w_800,h_600,q_auto,f_auto/${afterUpload}`
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
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
          Failed to load
        </div>
      )}
    </div>
  )
}

// Skeleton
const CollectionCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-200" />
    <div className="p-4 space-y-3">
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
)

// Collection Card
const CollectionCard: React.FC<{
  collection: EventCollection
  onClick: () => void
}> = ({ collection, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-purple-400 hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105"
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <LazyImage
          src={collection.eventImage || "/placeholder.svg"}
          alt={collection.collectionName || "Collection"}
          className="w-full h-full"
        />
        <div className="absolute top-3 left-3">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-lg"
            style={{ background: "#6b2fa5" }}
          >
            <Layers size={14} />
            Event Collection
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 group-hover:text-purple-700 transition-colors line-clamp-2 mb-2">
          {collection.collectionName || "Untitled Collection"}
        </h3>
        <p className="text-sm text-gray-500 font-medium">View all events in this collection</p>
      </div>
    </div>
  )
}

const EventCollections: React.FC<EventCollectionsProps> = ({ collections, loading, onCollectionClick }) => {
  if (collections.length === 0 && !loading) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold relative inline-block"
            style={{ color: "#6b2fa5" }}
          >
            <span className="relative z-10">Event Collections</span>
            <div
              className="absolute -bottom-1 left-0 w-full h-3 opacity-20 rounded-full"
              style={{ background: "#6b2fa5" }}
            />
          </h2>
          <Layers size={28} className="text-purple-500" />
        </div>
        <p className="text-gray-600 text-sm sm:text-base">Explore curated event series and collections</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CollectionCardSkeleton key={i} />)
        ) : (
          collections.map((collection, index) => (
            <CollectionCard
              key={collection.collectionId || `collection-${index}`}
              collection={collection}
              onClick={() => onCollectionClick(collection.collectionId)}
            />
          ))
        )}
      </div>
    </section>
  )
}

export default EventCollections