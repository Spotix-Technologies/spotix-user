"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Calendar, MapPin, User, Mail, Phone, Shield, CheckCircle, TrendingUp, ExternalLink } from "lucide-react"

interface BookerDetailsSectionProps {
  bookerDetails: {
    username: string
    email: string
    phone: string
    isVerified: boolean
  } | null
  bookerName: string
  creatorId: string
}

interface SuggestedEvent {
  id: string
  eventName: string
  eventImage: string
  eventDate: string
  eventVenue: string
}

// Utility function to transform Cloudinary URLs
const getOptimizedImageUrl = (url: string, width = 400, height = 300): string => {
  if (!url) return "/placeholder.svg"
  
  if (url.includes('cloudinary.com')) {
    const uploadIndex = url.indexOf('/upload/')
    if (uploadIndex !== -1) {
      const beforeUpload = url.substring(0, uploadIndex + 8)
      const afterUpload = url.substring(uploadIndex + 8)
      const transformations = `c_fill,w_${width},h_${height},q_auto,f_auto`
      return `${beforeUpload}${transformations}/${afterUpload}`
    }
  }
  
  return url
}

const BookerDetailsSection: React.FC<BookerDetailsSectionProps> = ({ bookerDetails, bookerName, creatorId }) => {
  const [suggestedEvents, setSuggestedEvents] = useState<SuggestedEvent[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const params = useParams()
  const currentEventId = params?.eventId as string

  useEffect(() => {
    const fetchSuggestedEvents = async () => {
      if (!creatorId) return

      setLoadingSuggestions(true)
      try {
        // Fetch from API
        const response = await fetch(
          `/api/v1/event/suggested?creatorId=${creatorId}&currentEventId=${currentEventId}&limit=10`
        )
        
        if (!response.ok) {
          console.error("Failed to fetch suggested events")
          return
        }

        const result = await response.json()
        
        if (result.success) {
          // Shuffle and take 3 events
          const shuffled = result.data.sort(() => 0.5 - Math.random())
          setSuggestedEvents(shuffled.slice(0, 3))
        }
      } catch (error) {
        console.error("Error fetching suggested events:", error)
      } finally {
        setLoadingSuggestions(false)
      }
    }

    fetchSuggestedEvents()
  }, [creatorId, currentEventId])

  const handleEventClick = (eventId: string) => {
    window.open(`/event/${creatorId}/${eventId}`, "_blank")
  }

  return (
    <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-2xl shadow-lg border-2 border-purple-100 overflow-hidden">
      {/* Header Section with Gradient */}
      <div className="bg-gradient-to-r from-[#6b2fa5] to-purple-700 p-6 md:p-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
            <User size={32} className="text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-1">Event Organizer</h2>
            <p className="text-purple-100 text-sm">Meet the team behind this amazing event</p>
          </div>
        </div>
      </div>

      {/* Organizer Details Section */}
      <div className="p-6 md:p-8">
        {bookerDetails ? (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-md border border-purple-100 p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#6b2fa5] to-purple-700 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">
                      {bookerDetails.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      {bookerDetails.username}
                      {bookerDetails.isVerified && (
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-md">
                          <CheckCircle size={14} />
                          Verified
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Professional Event Organizer</p>
                  </div>
                </div>
              </div>

              {/* Contact Information - Stacked layout for all screen sizes */}
              <div className="grid grid-cols-1 gap-4">
                {/* Email */}
                <div className="group bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 hover:shadow-md transition-all duration-300 border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                      <Mail size={18} className="text-[#6b2fa5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</p>
                      <p className="text-sm font-medium text-gray-900 break-all">{bookerDetails.email}</p>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="group bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 hover:shadow-md transition-all duration-300 border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                      <Phone size={18} className="text-[#6b2fa5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</p>
                      <p className="text-sm font-medium text-gray-900 break-all">{bookerDetails.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="group bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 hover:shadow-md transition-all duration-300 border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
                      <Shield size={18} className={bookerDetails.isVerified ? "text-green-600" : "text-gray-400"} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                            bookerDetails.isVerified
                              ? "bg-gradient-to-r from-green-500 to-green-600 text-white"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {bookerDetails.isVerified ? (
                            <>
                              <CheckCircle size={12} />
                              Verified
                            </>
                          ) : (
                            "Unverified"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Trust Indicators */}
              {bookerDetails.isVerified && (
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Shield size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900 mb-1">Verified Organizer</h4>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        This event organizer has been verified by Spotix. Their identity and credentials have been confirmed,
                        ensuring a trustworthy event experience.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggested Events Section */}
            <div className="bg-white rounded-xl shadow-md border border-purple-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#6b2fa5] to-purple-700 rounded-lg flex items-center justify-center shadow-sm">
                    <TrendingUp size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">More from {bookerName}</h3>
                    <p className="text-sm text-gray-500">Discover other amazing events</p>
                  </div>
                </div>
              </div>

              {loadingSuggestions ? (
                <div className="grid grid-cols-1 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-100 rounded-xl overflow-hidden animate-pulse">
                      <div className="h-40 bg-gray-200"></div>
                      <div className="p-4 space-y-2">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : suggestedEvents.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {suggestedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="group bg-white rounded-xl overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-[#6b2fa5] transform hover:scale-[1.02]"
                      onClick={() => handleEventClick(event.id)}
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Image */}
                        <div className="relative h-48 sm:h-40 sm:w-40 flex-shrink-0 overflow-hidden bg-gray-100">
                          <img
                            src={getOptimizedImageUrl(event.eventImage, 400, 300)}
                            alt={event.eventName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          {/* External Link Icon */}
                          <div className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                            <ExternalLink size={14} className="text-[#6b2fa5]" />
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="p-4 flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 mb-3 line-clamp-2 text-base group-hover:text-[#6b2fa5] transition-colors">
                            {event.eventName}
                          </h4>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <Calendar size={14} className="text-[#6b2fa5]" />
                              </div>
                              <span className="truncate">
                                {new Date(event.eventDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric"
                                })}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <MapPin size={14} className="text-[#6b2fa5]" />
                              </div>
                              <span className="truncate">{event.eventVenue}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No other events available at the moment</p>
                  <p className="text-sm text-gray-400 mt-2">Check back later for more events from {bookerName}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-[#6b2fa5] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading organizer details...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookerDetailsSection