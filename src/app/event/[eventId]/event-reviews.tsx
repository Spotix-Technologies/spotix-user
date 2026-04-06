"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import { Star, MessageSquare } from "lucide-react"

interface Review {
  id: string
  userId: string
  username: string
  rating: number
  comment: string
  createdAt: any
}

interface EventReviewsProps {
  eventId: string
  eventName: string
  eventEndDate: string
  eventEnd: string
  hasEventEnded: boolean
  isAuthenticated: boolean
}

const EventReviews: React.FC<EventReviewsProps> = ({
  eventId,
  eventName,
  eventEndDate,
  eventEnd,
  hasEventEnded,
  isAuthenticated,
}) => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [averageRating, setAverageRating] = useState(0)

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const reviewsRef = collection(db, "eventReviews", eventId, "reviews")
        const q = query(reviewsRef, orderBy("createdAt", "desc"), limit(10))
        const querySnapshot = await getDocs(q)

        const reviewsData: Review[] = []
        querySnapshot.forEach((doc) => {
          reviewsData.push({ id: doc.id, ...doc.data() } as Review)
        })

        setReviews(reviewsData)

        // Calculate average rating
        if (reviewsData.length > 0) {
          const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0)
          setAverageRating(totalRating / reviewsData.length)
        }
      } catch (error) {
        console.error("Error fetching reviews:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [eventId])

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} size={16} className={i < rating ? "text-yellow-400 fill-current" : "text-gray-300"} />
    ))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="w-4 h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {reviews.length > 0 ? (
        <>
          {/* Average Rating */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">{averageRating.toFixed(1)}</div>
                <div className="flex justify-center gap-1 mb-1">{renderStars(Math.round(averageRating))}</div>
                <div className="text-sm text-gray-600">
                  {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 mb-2">Overall Rating</h4>
                <p className="text-gray-600 text-sm">
                  Based on {reviews.length} review{reviews.length !== 1 ? "s" : ""} from event attendees
                </p>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-medium text-sm">
                      {review.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-800">{review.username}</span>
                      <div className="flex gap-1">{renderStars(review.rating)}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {review.createdAt?.toDate?.()?.toLocaleDateString() || "Recently"}
                    </div>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <MessageSquare size={48} className="text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-600 mb-2">No Reviews Yet</h4>
          <p className="text-gray-500">
            {hasEventEnded ? "Be the first to review this event!" : "Reviews will be available after the event ends."}
          </p>
        </div>
      )}
    </div>
  )
}

export default EventReviews
