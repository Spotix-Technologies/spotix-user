"use client"

import type React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import { ArrowLeft, Calendar, User, Clock } from "lucide-react"

interface EventGroupType {
  name: string
  image: string
  description: string
  createdAt: any
  creatorID?: string
  eventType?: string
  venue?: string
  eventStartDate?: string
  freeOrPaid?: boolean
  eventId?: string
  eventGroup?: boolean
}

interface EventVariation {
  id: string
  eventName: string
  eventImage: string
  eventDate: string
  eventVenue: string
  eventType: string
  isFree: boolean
  ticketPrices: { policy: string; price: number }[]
  createdAt: any
}

interface OrganizerInfo {
  username: string
  email: string
  isVerified: boolean
}

// Lazy loading hook
const useLazyLoading = (ref: React.RefObject<HTMLElement | null>, threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const currentRef = ref.current

    if (!currentRef) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold },
    )

    observer.observe(currentRef)

    return () => {
      observer.disconnect()
    }
  }, [ref, threshold])

  return isVisible
}

// Lazy Image Component
const LazyImage: React.FC<{
  src: string
  alt: string
  className?: string
  eventName?: string
}> = ({ src, alt, className, eventName }) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)
  const isVisible = useLazyLoading(imgRef)

  const getImageSrc = () => {
    return src || "/placeholder.svg"
  }


  return (
    <div ref={imgRef} className={`lazy-image-container ${className || ""}`}>
      {isVisible && (
        <>
          {!isLoaded && !hasError && (
            <div className="image-placeholder">
              <div className="image-skeleton"></div>
            </div>
          )}
          <img
            src={getImageSrc() || "/placeholder.svg"}
            alt={alt}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true)
              setIsLoaded(true)
            }}
            style={{
              opacity: isLoaded ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
            }}
          />
          {hasError && (
            <div className="image-error">
              <span>Failed to load image</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Loading skeleton component
const EventGroupSkeleton = () => (
  <div className="event-group-container animate-pulse">
    <div className="event-group-header">
      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
    </div>
    <div className="hero-section">
      <div className="h-96 w-full bg-gray-200 rounded-lg"></div>
    </div>
    <div className="content-section p-6 space-y-4">
      <div className="h-8 w-3/4 bg-gray-200 rounded-md"></div>
      <div className="h-32 w-full bg-gray-200 rounded-md"></div>
      <div className="flex space-x-4">
        <div className="h-6 w-32 bg-gray-200 rounded-md"></div>
        <div className="h-6 w-32 bg-gray-200 rounded-md"></div>
      </div>
    </div>
  </div>
)

const EventVariationCard: React.FC<{
  event: EventVariation
  onClick: () => void
}> = ({ event, onClick }) => {
  const formatNumber = useCallback((num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }, [])

  const formatCurrency = useCallback(
    (amount: number): string => {
      return `₦${formatNumber(Number.parseFloat(amount.toFixed(2)))}`
    },
    [formatNumber],
  )

  return (
    <div
      className="event-variation-card cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
    >
      <div className="variation-image relative overflow-hidden rounded-t-lg">
        <LazyImage
          src={event.eventImage || "/placeholder.svg"}
          alt={event.eventName}
          eventName={event.eventName}
          className="w-full h-48 object-cover"
        />
        <div className="variation-overlay absolute top-2 right-2">
          <span
            className={`price-tag px-2 py-1 rounded-full text-xs font-medium ${event.isFree ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}
          >
            {event.isFree ? "Free" : "Paid"}
          </span>
        </div>
      </div>
      <div className="variation-content p-4">
        <h3 className="variation-title font-semibold text-lg mb-2 line-clamp-2">{event.eventName}</h3>
        <div className="variation-details space-y-2">
          <div className="variation-date flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={14} />
            <span>
              {new Date(event.eventDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="variation-venue text-sm text-gray-600 line-clamp-1">
            <span>{event.eventVenue}</span>
          </div>
          {!event.isFree && event.ticketPrices && event.ticketPrices.length > 0 && (
            <div className="variation-price text-sm font-medium text-purple-600">
              <span>From {formatCurrency(Math.min(...event.ticketPrices.map((t) => Number(t.price))))}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  params: {
    creatorId: string
    eventName: string
  }
}

const EventGroupClient: React.FC<Props> = ({ params }) => {
  const router = useRouter()
  const { creatorId, eventName } = params

  const [eventGroupData, setEventGroupData] = useState<EventGroupType | null>(null)
  const [eventVariations, setEventVariations] = useState<EventVariation[]>([])
  const [organizerInfo, setOrganizerInfo] = useState<OrganizerInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEventGroupData = useCallback(async () => {
    try {
      if (!creatorId || !eventName) {
        setError("Missing required parameters")
        setLoading(false)
        return
      }

      const decodedEventName = decodeURIComponent(eventName.replace(/\+/g, " "))

      // Try multiple variations of the event name to handle encoding issues
      const eventNameVariations = [
        decodedEventName,
        eventName.replace(/%20/g, " "), // Handle %20 as spaces
        eventName.replace(/\+/g, " "), // Handle + as spaces
        decodeURI(eventName),
        decodeURIComponent(eventName),
        eventName, // Try original as fallback
      ]

      let collectionDoc: any = null
      let usedEventName: string | null = null

      for (const nameVariation of eventNameVariations) {
        try {
          const collectionDocRef = doc(db, "EventCollection", creatorId, "collections", nameVariation)
          const testDoc = await getDoc(collectionDocRef)
          if (testDoc.exists()) {
            collectionDoc = testDoc
            usedEventName = nameVariation
            console.log("  Found event collection with name variation:", nameVariation)
            break
          }
        } catch (err) {
          console.log("  Failed to find collection with name:", nameVariation)
          // Continue to next variation
        }
      }

      if (!collectionDoc || !collectionDoc.exists()) {
        setError("Event collection not found")
        setLoading(false)
        return
      }

      const collectionData = collectionDoc.data() as EventGroupType
      setEventGroupData(collectionData)

      // Fetch organizer info
      const organizerDoc = await getDoc(doc(db, "users", creatorId))
      if (organizerDoc.exists()) {
        const organizerData = organizerDoc.data()
        setOrganizerInfo({
          username: organizerData.username || "Unknown Organizer",
          email: organizerData.email || "Not provided",
          isVerified: organizerData.isVerified || false,
        })
      }

      // Fetch event variations using the successfully found event name
      if (!usedEventName) {
        setError("Event collection not found")
        setLoading(false)
        return
      }
      const eventsCollectionRef = collection(db, "EventCollection", creatorId, "collections", usedEventName, "events")
      const eventsQuery = query(eventsCollectionRef, orderBy("createdAt", "desc"))
      const eventsSnapshot = await getDocs(eventsQuery)

      const variations: EventVariation[] = []
      eventsSnapshot.forEach((eventDoc) => {
        const eventData = eventDoc.data()
        variations.push({ id: eventDoc.id, ...eventData } as EventVariation)
      })

      setEventVariations(variations)
    } catch (error) {
      setError("Failed to load event collection")
    } finally {
      setLoading(false)
    }
  }, [creatorId, eventName])

  useEffect(() => {
    fetchEventGroupData()
  }, [fetchEventGroupData])

  const handleBackClick = () => {
    router.push("/home")
  }

  const handleVariationClick = (variation: EventVariation) => {
    router.push(`/event/${variation.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserHeader />
        <div className="main-content">
          <EventGroupSkeleton />
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !eventGroupData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserHeader />
        <div className="main-content">
          <div className="error-message max-w-2xl mx-auto p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Event Collection</h2>
            <p className="text-gray-600 mb-6">{error || "Event collection not found."}</p>
            <button
              onClick={handleBackClick}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Format the timestamp if it exists
  const formattedDate = eventGroupData.createdAt
    ? typeof eventGroupData.createdAt.toDate === "function"
      ? eventGroupData.createdAt.toDate().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : new Date(eventGroupData.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
    : "Date not available"

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />

      <div className="main-content">
        <div className="max-w-6xl mx-auto">
          <div className="event-group-header p-4">
            <button
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
              onClick={handleBackClick}
            >
              <ArrowLeft size={24} />
              <span className="font-medium">Back to Events</span>
            </button>
          </div>

          {/* Hero Section with Blurred Background */}
          <div className="hero-section relative h-96 overflow-hidden rounded-2xl mx-4 mb-8">
            <div className="hero-background absolute inset-0">
              <LazyImage
                src={eventGroupData.image || "/placeholder.svg"}
                alt={eventGroupData.name}
                className="w-full h-full object-cover"
                eventName={eventGroupData.name}
              />
              <div className="hero-overlay absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60"></div>
            </div>
            <div className="hero-content absolute inset-0 flex items-center justify-center text-center text-white p-6">
              <div className="max-w-2xl">
                <div className="collection-badge mb-4">
                  <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide border border-white/30">
                    Event Collection
                  </span>
                </div>
                <h1 className="hero-title text-4xl md:text-6xl font-black mb-4 text-shadow-lg">
                  {eventGroupData.name}
                </h1>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="content-section px-4 pb-8">
            {/* Event Description */}
            {eventGroupData.description && (
              <div className="description-section bg-white rounded-xl p-6 mb-8 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">About This Collection</h2>
                <p className="description-text text-gray-600 leading-relaxed">{eventGroupData.description}</p>
              </div>
            )}

            {/* Collection Info */}
            <div className="info-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="info-card bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="info-icon bg-purple-100 p-3 rounded-full">
                    <Calendar size={20} className="text-purple-600" />
                  </div>
                  <div className="info-content">
                    <span className="info-label block text-sm text-gray-500 font-medium">Collection Created</span>
                    <span className="info-value text-lg font-semibold text-gray-800">{formattedDate}</span>
                  </div>
                </div>
              </div>

              {organizerInfo && (
                <div className="info-card bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="info-icon bg-blue-100 p-3 rounded-full">
                      <User size={20} className="text-blue-600" />
                    </div>
                    <div className="info-content">
                      <span className="info-label block text-sm text-gray-500 font-medium">Organized by</span>
                      <span className="info-value text-lg font-semibold text-gray-800 flex items-center gap-2">
                        {organizerInfo.username}
                        {organizerInfo.isVerified && (
                          <span
                            className="verified-badge bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full"
                            title="Verified Organizer"
                          >
                            ✓ Verified
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Event Variations */}
            <div className="variations-section">
              <div className="variations-header bg-white rounded-xl p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">Event Variations</h2>
                  <div className="variations-count flex items-center gap-2 text-gray-600">
                    <Clock size={16} />
                    <span className="text-sm font-medium">
                      {eventVariations.length} variation{eventVariations.length !== 1 ? "s" : ""} available
                    </span>
                  </div>
                </div>
              </div>

              {eventVariations.length > 0 ? (
                <div className="variations-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {eventVariations.map((variation) => (
                    <div
                      key={variation.id}
                      className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-200"
                    >
                      <EventVariationCard event={variation} onClick={() => handleVariationClick(variation)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-variations bg-white rounded-xl p-12 text-center shadow-sm">
                  <div className="text-gray-400 mb-4">
                    <Calendar size={48} className="mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No Events Yet</h3>
                  <p className="text-gray-500 mb-2">No event variations available yet.</p>
                  <p className="text-gray-500">Check back later for upcoming events in this collection!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />

      <style jsx>{`
        .text-shadow-lg {
          text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.5);
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

export default EventGroupClient
