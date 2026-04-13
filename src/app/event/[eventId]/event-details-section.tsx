import React from "react"
import { Heart, Share2, AlertCircle } from "lucide-react"
import type { EventType } from "./page"

interface EventDetailsSectionProps {
  eventData: EventType
  eventUrl: string
  isLiked: boolean
  likeCount: number
  isLiking: boolean
  isSoldOut: boolean
  onToggleLike: () => void
}

const EventDetailsSection: React.FC<EventDetailsSectionProps> = ({
  eventData,
  eventUrl,
  isLiked,
  likeCount,
  isLiking,
  isSoldOut,
  onToggleLike,
}) => {
  const handleShare = async () => {
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: eventData.eventName,
          text: `Check out this event: ${eventData.eventName}`,
          url: eventUrl,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(eventUrl)
      alert("Event link copied to clipboard!")
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 border-purple-100">
      {/* Title and Status */}
      <div className="mb-6">
        <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 text-balance">
          {eventData.eventName}
        </h1>

        {isSoldOut && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
            <p className="text-red-700 font-medium">This event is sold out</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 text-gray-600">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
            {eventData.eventType}
          </span>
          <span className="text-sm">
            {new Date(eventData.eventDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {eventData.eventStart && (
            <span className="text-sm">
              {eventData.eventStart} - {eventData.eventEnd || "TBD"}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {eventData.eventDescription && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">About this event</h3>
          <p className="text-gray-700 leading-relaxed text-pretty">
            {eventData.eventDescription}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleLike}
          disabled={isLiking}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isLiked
              ? "bg-red-50 text-red-600 hover:bg-red-100"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Heart
            size={20}
            fill={isLiked ? "currentColor" : "none"}
            className={isLiked ? "text-red-600" : ""}
          />
          <span>
            {likeCount} {likeCount === 1 ? "Like" : "Likes"}
          </span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          <Share2 size={20} />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>
    </div>
  )
}

export default EventDetailsSection
