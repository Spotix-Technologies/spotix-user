"use client"

import type React from "react"
import { MessageSquare } from "lucide-react"
import EventReviews from "./event-reviews"
// import Review from "./review"

interface ReviewsSectionProps {
  eventId: string
  eventName: string
  eventEndDate: string
  eventEnd: string
  hasEventEnded: boolean
  isAuthenticated: boolean
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  eventId,
  eventName,
  eventEndDate,
  eventEnd,
  hasEventEnded,
  isAuthenticated,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare size={24} className="text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-800">Event Reviews</h2>
      </div>

      {hasEventEnded ? (
        <>
          <EventReviews
            eventId={eventId}
            eventName={eventName}
            eventEndDate={eventEndDate}
            eventEnd={eventEnd}
            hasEventEnded={hasEventEnded}
            isAuthenticated={isAuthenticated}
          />

          {/* <div className="mt-6 pt-6 border-t">
            <Review eventId={eventId} eventName={eventName} />
          </div> */}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <MessageSquare size={48} className="text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Reviews Coming Soon</h3>
            <p className="text-blue-700">
              Reviews will be available after the event has ended. Check back after{" "}
              {new Date(eventEndDate).toLocaleDateString()} to see what attendees thought about this event!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReviewsSection
