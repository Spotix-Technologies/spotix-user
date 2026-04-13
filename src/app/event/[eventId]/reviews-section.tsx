"use client"

import React, { useState, useEffect } from "react"
import { Star, Send } from "lucide-react"

interface ReviewsSectionProps {
  eventId: string
  eventName: string
  eventEndDate: string
  eventEnd?: string
  hasEventEnded: boolean
  isAuthenticated: boolean
}

interface Review {
  id: string
  userName: string
  rating: number
  comment: string
  createdAt: string
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  eventId,
  eventName,
  eventEndDate,
  eventEnd,
  hasEventEnded,
  isAuthenticated,
}) => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [averageRating, setAverageRating] = useState(0)

  // Fetch reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch(`/api/v1/event/reviews?eventId=${eventId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setReviews(result.data.reviews || [])
            setAverageRating(result.data.averageRating || 0)
          }
        }
      } catch (error) {
        console.error("Error fetching reviews:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [eventId])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!comment.trim()) {
      alert("Please enter a comment")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/v1/event/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          rating,
          comment,
        }),
        credentials: "same-origin",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setComment("")
          setRating(5)
          // Refetch reviews
          const refreshResponse = await fetch(`/api/v1/event/reviews?eventId=${eventId}`)
          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json()
            if (refreshResult.success && refreshResult.data) {
              setReviews(refreshResult.data.reviews || [])
              setAverageRating(refreshResult.data.averageRating || 0)
            }
          }
        }
      } else {
        alert("Failed to submit review")
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      alert("Error submitting review")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 border-purple-100">
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Reviews</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={18}
                  className={
                    i < Math.round(averageRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }
                />
              ))}
            </div>
            <span className="text-gray-600 font-medium">
              {averageRating.toFixed(1)} ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
            </span>
          </div>
        )}
      </div>

      {/* Review Form - Show only if event has ended and user is authenticated */}
      {hasEventEnded && isAuthenticated && (
        <div className="mb-8 p-6 bg-purple-50 rounded-xl border border-purple-200">
          <h4 className="font-semibold text-gray-900 mb-4">Share your experience</h4>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={24}
                      className={
                        value <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts about this event..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] resize-none"
                rows={4}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#6b2fa5] text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={18} />
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-full bg-gray-200 rounded mb-2" />
              <div className="h-3 w-5/6 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="pb-6 border-b border-gray-200 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{review.userName}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-gray-700">{review.comment}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No reviews yet</p>
          {hasEventEnded && isAuthenticated && (
            <p className="text-sm text-gray-400 mt-2">Be the first to review this event!</p>
          )}
        </div>
      )}
    </div>
  )
}

export default ReviewsSection
