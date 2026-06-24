"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { MapPin, Music, Filter, Loader2, Calendar, ChevronDown, RefreshCw, ExternalLink } from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"

// ── Constants ─────────────────────────────────────────────────────────────────
const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers",
  "Sokoto","Taraba","Yobe","Zamfara",
]

const GENRES = ["All","Music","Arts & Culture","Technology","Food & Drinks","Sports","Business","Fashion","Comedy","Education","Religious","Social","Other"]

// Normalize Nominatim state names to our list
function normalizeStateName(raw: string): string {
  const cleaned = raw.replace(/ State$/i, "").replace(/ Capital Territory$/i, "").trim()
  const match = NIGERIAN_STATES.find(
    (s) => s.toLowerCase() === cleaned.toLowerCase() ||
           s.toLowerCase().replace(" ", "") === cleaned.toLowerCase().replace(" ", "")
  )
  return match || cleaned
}

interface DiscoverEvent {
  id: string; state: string; eventName: string; description: string
  host: string; location: string; genre: string; eventStart: string
  eventEnd: string | null; ticketPolicy: string; isSpotixEvent: boolean
  spotixEventId: string | null; ticketLink: string | null
  imageUrl: string; postedBy: string
}

// ── Geolocation helpers ───────────────────────────────────────────────────────
async function reverseGeocodeNigerianState(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
      { headers: { "Accept-Language": "en-US,en", "User-Agent": "SpotixApp/1.0" } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const rawState: string =
      data.address?.state || data.address?.county || data.address?.region || ""
    if (!rawState) return null
    return normalizeStateName(rawState)
  } catch {
    return null
  }
}

// ── Event card ────────────────────────────────────────────────────────────────
function DiscoverCard({ event, onClick }: { event: DiscoverEvent; onClick: () => void }) {
  const start = new Date(event.eventStart)
  const isSpotix = event.isSpotixEvent

  return (
    <div onClick={onClick}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-[#6b2fa5]/40 hover:shadow-xl transition-all duration-300 cursor-pointer">
      <div className="relative h-44 overflow-hidden bg-gray-100">
        <img src={event.imageUrl || "/spotix-placeholder.png"} alt={event.eventName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent" />

        {/* Genre */}
        <span className="absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold bg-black/50 text-white rounded-full backdrop-blur-sm">
          {event.genre || "Event"}
        </span>

        {/* Spotix / External badge */}
        <span className={`absolute top-3 right-3 px-2.5 py-1 text-xs font-bold rounded-full ${isSpotix ? "bg-[#6b2fa5] text-white" : "bg-white/90 text-gray-700"}`}>
          {isSpotix ? "On Spotix" : "External"}
        </span>

        {/* Date chip */}
        <div className="absolute bottom-3 right-3 bg-white rounded-xl shadow p-1.5 text-center min-w-[48px]">
          <p className="text-[10px] font-semibold uppercase" style={{ color: "#6b2fa5" }}>
            {start.toLocaleDateString("en-NG", { month: "short" })}
          </p>
          <p className="text-xl font-bold text-gray-900 leading-none">{start.getDate()}</p>
        </div>
      </div>

      <div className="p-4 space-y-1.5">
        <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-[#6b2fa5] transition-colors">{event.eventName}</h3>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{event.location || event.state}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{start.toLocaleDateString("en-NG", { weekday:"short", day:"numeric", month:"short", year:"numeric" })}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${event.ticketPolicy === "free" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
            {event.ticketPolicy === "free" ? "Free" : "Paid"}
          </span>
          {event.host && <span className="text-xs text-gray-400 truncate max-w-[100px]">by {event.host}</span>}
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DiscoverPageClient() {
  const router = useRouter()

  const [selectedState, setSelectedState] = useState<string>("")
  const [selectedGenre, setSelectedGenre] = useState<string>("All")
  const [events, setEvents] = useState<DiscoverEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationGranted, setLocationGranted] = useState(false)

  // ── Fetch events ─────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async (state: string, genre: string) => {
    if (!state) return
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams({ state })
      if (genre && genre !== "All") params.set("genre", genre)
      const res = await fetch(`/api/v1/discover?${params}`)
      if (res.status === 429) { setError("Too many requests. Please wait a moment."); return }
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setEvents(json.events || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedState) fetchEvents(selectedState, selectedGenre)
  }, [selectedState, selectedGenre, fetchEvents])

  // ── Geolocation ───────────────────────────────────────────────────────────
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.")
      return
    }
    setLocationLoading(true); setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const state = await reverseGeocodeNigerianState(pos.coords.latitude, pos.coords.longitude)
        setLocationLoading(false)
        if (state && NIGERIAN_STATES.includes(state)) {
          setSelectedState(state)
          setLocationGranted(true)
        } else if (state) {
          // Try a partial match
          const partial = NIGERIAN_STATES.find(s => s.toLowerCase().includes(state.toLowerCase()))
          if (partial) { setSelectedState(partial); setLocationGranted(true) }
          else setLocationError(`Could not map "${state}" to a Nigerian state. Please select manually.`)
        } else {
          setLocationError("Could not determine your state. Please select manually.")
        }
      },
      (err) => {
        setLocationLoading(false)
        if (err.code === err.PERMISSION_DENIED) setLocationError("Location access denied. Please select your state manually.")
        else setLocationError("Could not get your location. Please select manually.")
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }

  // Auto-request on mount
  useEffect(() => { requestLocation() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEventClick = (event: DiscoverEvent) => {
    if (event.isSpotixEvent && event.spotixEventId) {
      router.push(`/event/${event.spotixEventId}`)
    } else {
      router.push(`/discover/${encodeURIComponent(event.state)}/${event.id}`)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />

      {/* Hero */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        <Image src="/discover.png" alt="Event Discovery in Nigeria" fill className="object-cover" priority
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#6b2fa5]/80 to-[#1a0840]/90 flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
            Event Discovery
          </h1>
          <p className="text-white/80 text-lg md:text-xl font-medium mt-2">in Nigeria</p>
          {selectedState && locationGranted && (
            <div className="mt-4 flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5">
              <MapPin className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-semibold">{selectedState}</span>
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Location prompt / error */}
        {locationLoading && (
          <div className="flex items-center gap-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <Loader2 className="w-4 h-4 animate-spin text-[#6b2fa5]" />
            We are detecting your location…
          </div>
        )}
        {locationError && (
          <div className="flex items-start justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <span>{locationError}</span>
            <button onClick={requestLocation} className="shrink-0 text-[#6b2fa5] font-semibold hover:underline text-xs flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* State */}
          <div className="relative flex-1 sm:max-w-xs">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5] font-medium">
              <option value="">Select State</option>
              {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Genre */}
          <div className="relative flex-1 sm:max-w-xs">
            <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={selectedGenre} onChange={e => setSelectedGenre(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5] font-medium">
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Events grid */}
        {!selectedState && !locationLoading && (
          <div className="text-center py-16 text-gray-400">
            <Filter className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Allow location access or select a state to see events near you.</p>
          </div>
        )}

        {selectedState && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">
                Events in <span style={{ color: "#6b2fa5" }}>{selectedState}</span>
                {selectedGenre !== "All" && <span className="text-gray-500 font-normal text-base"> · {selectedGenre}</span>}
              </h2>
              {!loading && <span className="text-sm text-gray-500">{events.length} event{events.length !== 1 ? "s" : ""}</span>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
                : events.length > 0
                  ? events.map(e => <DiscoverCard key={e.id} event={e} onClick={() => handleEventClick(e)} />)
                  : (
                    <div className="col-span-full text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                      <Calendar className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500 text-sm">No upcoming events found in {selectedState}{selectedGenre !== "All" ? ` for ${selectedGenre}` : ""}.</p>
                    </div>
                  )
              }
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
