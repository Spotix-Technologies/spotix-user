"use client"

import type React from "react"
import { useEffect, useState } from "react"
import UserHeader from "../../components/UserHeader"
import Footer from "../../components/footer"
import Preloader from "@/components/Preloader"
import Header from "./components/Header"
import FeaturedBanner from "./components/FeaturedBanner"
import FilterBar from "./components/FilterBar"
import EventList from "./components/EventList"
import CollectionsRow from "./components/CollectionsRow"
import EventCalendar from "./components/EventCalendar"
import ViewSettings from "./components/ViewSettings"
import { useHomeEvents } from "./hooks/useHomeEvents"
import { useFeaturedEvents } from "./hooks/useFeaturedEvents"
import { useEventFilters } from "./hooks/useEventFilters"
import { useHomeSettings } from "./hooks/useHomeSettings"
import { PAGE_SIZE } from "./constants"
import type { SessionUser } from "../lib/auth-client-user"

interface HomeProps {
  user?: SessionUser | null
}

const Home: React.FC<HomeProps> = ({ user }) => {
  const [showPreloader, setShowPreloader] = useState(true)
  const [username, setUsername] = useState("")

  // Auth comes from the session `user` prop (already resolved by useAuth) —
  // no second /api/v1/auth round-trip.
  const isAuthenticated = Boolean(user)

  useEffect(() => {
    if (!user) {
      setUsername("")
      return
    }
    try {
      const stored = localStorage.getItem("spotix_user")
      if (stored) {
        const u = JSON.parse(stored)
        setUsername(u.username || u.fullName || "")
      }
    } catch {
      /* ignore malformed cache */
    }
  }, [user])

  const { events, collections, loading } = useHomeEvents()
  const { featured, loading: featuredLoading } = useFeaturedEvents()
  const filters = useEventFilters(events)
  const { calendarView, setCalendarView } = useHomeSettings()

  if (showPreloader) {
    return <Preloader onLoadingComplete={() => setShowPreloader(false)} minDisplayTime={3000} />
  }

  return (
    <div className="min-h-screen bg-white">
      <UserHeader />

      <main>
        <Header isAuthenticated={isAuthenticated} username={username} />

        <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
          <FeaturedBanner events={featured} loading={featuredLoading} />

          <div className="space-y-3">
            <ViewSettings calendarView={calendarView} onCalendarViewChange={setCalendarView} />
            <FilterBar
              searchQuery={filters.searchQuery}
              onSearchChange={filters.setSearchQuery}
              suggestions={filters.suggestions}
              categories={filters.categories}
              category={filters.category}
              onCategoryChange={filters.setCategory}
              price={filters.price}
              onPriceChange={filters.setPrice}
            />
          </div>

          {calendarView ? (
            <>
              <EventCalendar applyFilters={filters.apply} />
              <CollectionsRow collections={collections} loading={loading} />
            </>
          ) : (
            <>
              {/* `key` resets each list's page whenever a filter changes */}
              <EventList
                key={`today-${filters.signature}`}
                title="Today"
                events={filters.filtered.today}
                loading={loading}
                pageSize={PAGE_SIZE.today}
                hideWhenEmpty
              />
              <EventList
                key={`upcoming-${filters.signature}`}
                title="Upcoming"
                events={filters.filtered.upcoming}
                loading={loading}
                pageSize={PAGE_SIZE.upcoming}
                emptyText="No upcoming events found."
              />
              <CollectionsRow collections={collections} loading={loading} />
              <EventList
                key={`past-${filters.signature}`}
                title="Past events"
                events={filters.filtered.past}
                loading={loading}
                pageSize={PAGE_SIZE.past}
                past
                hideWhenEmpty
              />
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Home
