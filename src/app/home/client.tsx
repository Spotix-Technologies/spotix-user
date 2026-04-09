"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import UserHeader from "../../components/UserHeader"
import Footer from "../../components/footer"
import ImageCarousels from "../../components/carousel"
import Preloader from "@/components/Preloader"
import Header from "./components/Header"
import SearchBar from "./components/SearchBar"
import Today from "./components/Today"
import TodayEvents from "./components/Todayevents"
import UpcomingEvents from "./components/UpcomingEvents"
import EventCollections from "./components/EventCollections"
import PastEvents from "./components/PastEvents"

// ─── Types ────────────────────────────────────────────────────────────────────

interface HomeEvent {
  eventId: string
  eventName: string
  venue: string
  eventType: string
  eventStartDate: string
  freeOrPaid: boolean
  eventImage: string
}

interface EventCollection {
  collectionId: string
  collectionName: string
  creatorId: string
  eventImage: string
}

interface HomeData {
  events: {
    today: HomeEvent[]
    upcoming: HomeEvent[]
    past: HomeEvent[]
  }
  collections: EventCollection[]
}

interface SearchSuggestion {
  eventName: string
  eventId: string
}

// ─── Component ────────────────────────────────────────────────────────────────

const Home: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(true)
  const [showPreloader, setShowPreloader] = useState(true)

  // Home data
  const [homeData, setHomeData] = useState<HomeData>({
    events: { today: [], upcoming: [], past: [] },
    collections: [],
  })

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string | null>(null)
  const [priceFilter, setPriceFilter] = useState<string | null>(null)
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const router = useRouter()
  const hasActiveFilters = Boolean(searchQuery || filterType || priceFilter)

  // ── Auth check (only once on mount) ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const checkAuth = async () => {
      try {
        const response = await fetch("/api/v1/auth", {
          method: "GET",
          credentials: "include",
        })
        const data = await response.json()

        if (!cancelled) {
          if (data.authenticated) {
            setIsAuthenticated(true)
            const storedUser = localStorage.getItem("spotix_user")
            if (storedUser) {
              const userData = JSON.parse(storedUser)
              setUsername(userData.username || userData.fullName || "")
            }
          } else {
            setIsAuthenticated(false)
          }
        }
      } catch (error) {
        console.error("  Error checking auth:", error)
        if (!cancelled) {
          setIsAuthenticated(false)
        }
      }
    }

    checkAuth()
    return () => { cancelled = true }
  }, [])

  // ── Fetch home data from API ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchHomeData = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/v1/home", {
          method: "GET",
          credentials: "include",
        })
        const json = await response.json()

        if (json.success && json.data) {
          setHomeData(json.data)
        } else {
          console.error("[Home] API returned error:", json.error)
        }
      } catch (error) {
        console.error("[Home] Failed to fetch home data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchHomeData()
  }, [])

  // ── Search suggestions ───────────────────────────────────────────────────────
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const allEvents = [
        ...homeData.events.today,
        ...homeData.events.upcoming,
        ...homeData.events.past,
      ]

      const suggestions = allEvents
        .filter((event) =>
          event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.eventId.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
        .map((event) => ({
          eventName: event.eventName,
          eventId: event.eventId,
        }))

      setSearchSuggestions(suggestions)
      setShowSuggestions(suggestions.length > 0)
    } else {
      setSearchSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchQuery, homeData.events])

  // ── Filter helper ────────────────────────────────────────────────────────────
  const filterEvents = useCallback(
    (events: HomeEvent[]) => {
      return events.filter((event) => {
        if (searchQuery) {
          const matchesSearch =
            event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.eventId.toLowerCase().includes(searchQuery.toLowerCase())
          if (!matchesSearch) return false
        }

        if (filterType && event.eventType !== filterType) return false

        if (priceFilter) {
          if (priceFilter === "free" && event.freeOrPaid) return false
          if (priceFilter === "paid" && !event.freeOrPaid) return false
        }

        return true
      })
    },
    [searchQuery, filterType, priceFilter]
  )

  const filteredTodayEvents    = filterEvents(homeData.events.today)
  const filteredUpcomingEvents = filterEvents(homeData.events.upcoming)
  const filteredPastEvents     = filterEvents(homeData.events.past)

  // ── Navigation ───────────────────────────────────────────────────────────────
  const navigateToEvent = (eventId: string) => {
    router.push(`/event/${eventId}`)
  }

  const navigateToCollection = (collectionId: string) => {
    router.push(`/event-group/${collectionId}`)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.eventName)
    setShowSuggestions(false)
    navigateToEvent(suggestion.eventId)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatTodayDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handlePreloaderComplete = () => setShowPreloader(false)

  // ── Render ───────────────────────────────────────────────────────────────────
  if (showPreloader) {
    return <Preloader onLoadingComplete={handlePreloaderComplete} minDisplayTime={3000} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <UserHeader />

      <main className="w-full">
        <Header isAuthenticated={isAuthenticated} username={username} />

        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchSuggestions={searchSuggestions}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          filterType={filterType}
          setFilterType={setFilterType}
          priceFilter={priceFilter}
          setPriceFilter={setPriceFilter}
          hasActiveFilters={hasActiveFilters}
          onSuggestionClick={handleSuggestionClick}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <ImageCarousels />
        </div>

        <Today todayDate={formatTodayDate()} />

        <TodayEvents
          events={filteredTodayEvents}
          loading={loading}
          onEventClick={navigateToEvent}
        />

        <UpcomingEvents
          events={filteredUpcomingEvents}
          loading={loading}
          onEventClick={navigateToEvent}
        />

        <EventCollections
          collections={homeData.collections}
          loading={loading}
          onCollectionClick={navigateToCollection}
        />

        <PastEvents
          events={filteredPastEvents}
          loading={loading}
          onEventClick={navigateToEvent}
        />
      </main>

      <Footer />
    </div>
  )
}

export default Home
