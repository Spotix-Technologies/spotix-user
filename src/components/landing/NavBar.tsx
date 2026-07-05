"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Menu, X, Search, Loader2 } from "lucide-react"
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/app/lib/firebase"

interface SearchResult {
  eventId: string
  eventName: string
  imageURL: string
  creatorID: string
  eventType: string
  venue: string
  eventGroup: boolean
}

const Navbar = () => {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [allEvents, setAllEvents] = useState<SearchResult[]>([])
  const [desktopSearchExpanded, setDesktopSearchExpanded] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const desktopSearchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "unset"
  }, [menuOpen])

  // Fetch all events once on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsQuery = query(
          collection(db, "publicEvents"),
          orderBy("timestamp", "desc"),
          limit(100)
        )
        const snapshot = await getDocs(eventsQuery)

        const events: SearchResult[] = snapshot.docs
          .map((doc) => {
            const data = doc.data()
            const creatorId = data.creatorID || data.creatorId || ""
            return {
              eventId: data.eventId || doc.id,
              eventName: data.eventName || "",
              imageURL: data.imageURL || "",
              creatorID: creatorId,
              eventType: data.eventType || "",
              venue: data.venue || "",
              eventGroup: data.eventGroup || false,
            }
          })
          .filter((event) => event.eventName && event.creatorID && !event.eventGroup)

        setAllEvents(events)
      } catch (error) {
        console.error("Error fetching events:", error)
      }
    }

    fetchEvents()
  }, [])

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setIsSearching(true)
    const debounceTimer = setTimeout(() => {
      const q = searchQuery.toLowerCase()
      const filtered = allEvents
        .filter(
          (event) =>
            event.eventName.toLowerCase().includes(q) ||
            event.eventType.toLowerCase().includes(q) ||
            event.venue.toLowerCase().includes(q)
        )
        .slice(0, 5)

      setSearchResults(filtered)
      setShowResults(filtered.length > 0)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, allEvents])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target as Node)) {
        if (!searchQuery) setDesktopSearchExpanded(false)
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [searchQuery])

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery("")
    setShowResults(false)
    setDesktopSearchExpanded(false)
    setMenuOpen(false)

    if (result.creatorID && result.eventId) {
      router.push(`/event/${result.creatorID}/${result.eventId}`)
    } else {
      console.error("Missing creatorID or eventId:", result)
    }
  }

  const getOptimizedImageUrl = (url: string): string => {
    if (!url) return "/placeholder.svg"
    if (url.includes("cloudinary.com")) {
      const uploadIndex = url.indexOf("/upload/")
      if (uploadIndex !== -1) {
        const beforeUpload = url.substring(0, uploadIndex + 8)
        const afterUpload = url.substring(uploadIndex + 8)
        return `${beforeUpload}c_fill,w_80,h_80,q_auto,f_auto/${afterUpload}`
      }
    }
    return url
  }

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/pricing", label: "Pricing" },
  ]

  const ResultsList = () => (
    <>
      {isSearching ? (
        <div className="p-6 flex items-center justify-center text-[#6b2fa5]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : (
        searchResults.map((result) => (
          <div
            key={`${result.creatorID}-${result.eventId}`}
            onClick={() => handleResultClick(result)}
            className="flex items-center gap-3 p-3 hover:bg-[#f5f0fb] cursor-pointer transition-colors border-b border-[#ece7f1] last:border-b-0"
          >
            <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={getOptimizedImageUrl(result.imageURL)}
                alt={result.eventName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#171123] truncate text-sm">{result.eventName}</p>
              <p className="text-xs text-[#7c7389] truncate">
                {result.eventType} • {result.venue}
              </p>
            </div>
          </div>
        ))
      )}
    </>
  )

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/90 backdrop-blur-lg shadow-sm border-b border-[#ece7f1]" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="relative w-10 h-10 transition-transform duration-300 group-hover:scale-105">
                <Image src="/logo.png" alt="Spotix Logo" fill className="object-contain" priority />
              </div>
              <span
                className={`text-xl font-bold tracking-tight transition-colors duration-300 ${
                  scrolled ? "text-[#6b2fa5]" : "text-white"
                }`}
                style={{ textShadow: scrolled ? "none" : "0 1px 6px rgba(0,0,0,0.35)" }}
              >
                Spotix
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 transition-colors duration-300 font-medium ${
                    scrolled ? "text-[#4b4257] hover:text-[#6b2fa5]" : "text-white/90 hover:text-white"
                  }`}
                >
                  {link.label}
                </a>
              ))}

              {/* Desktop Search */}
              <div
                ref={desktopSearchRef}
                className="relative ml-2"
                onMouseEnter={() => setDesktopSearchExpanded(true)}
              >
                <div
                  className={`flex items-center transition-all duration-300 ${
                    desktopSearchExpanded ? "w-72" : "w-10"
                  }`}
                >
                  <div className="relative w-full">
                    <Search
                      size={18}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
                        scrolled ? "text-[#6b2fa5]" : "text-white"
                      }`}
                    />
                    {desktopSearchExpanded && (
                      <input
                        type="text"
                        placeholder="Search events..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setShowResults(searchResults.length > 0)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-[#e4d6f5] rounded-full text-sm text-[#171123] placeholder-[#7c7389] focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5] transition-all duration-300"
                        autoFocus
                      />
                    )}
                  </div>
                </div>

                {showResults && desktopSearchExpanded && (
                  <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-[#ece7f1] overflow-hidden z-50 max-h-96 overflow-y-auto">
                    <ResultsList />
                  </div>
                )}
              </div>

              {/* Desktop Auth Buttons */}
              <div className="flex items-center space-x-3 ml-3">
                <Link
                  href="/auth/login"
                  className={`px-5 py-2.5 font-semibold rounded-full transition-all duration-300 border ${
                    scrolled
                      ? "text-[#6b2fa5] border-[#6b2fa5] hover:bg-[#f5f0fb]"
                      : "text-white border-white/60 hover:bg-white/10"
                  }`}
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-5 py-2.5 bg-[#6b2fa5] text-white font-semibold rounded-full hover:bg-[#4c2178] transition-all duration-300"
                >
                  Sign Up
                </Link>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(true)}
              className={`lg:hidden p-2 rounded-lg transition-all duration-300 ${
                scrolled ? "hover:bg-[#f5f0fb]" : "hover:bg-white/10"
              }`}
              aria-label="Open menu"
            >
              <Menu size={24} className={scrolled ? "text-[#171123]" : "text-white"} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 lg:hidden ${
          menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 transition-transform duration-300 ease-out lg:hidden ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#ece7f1]">
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10">
              <Image src="/logo.png" alt="Spotix Logo" fill className="object-contain" />
            </div>
            <span className="text-lg font-bold text-[#6b2fa5]">Spotix</span>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-[#f5f0fb] transition-colors duration-300"
            aria-label="Close menu"
          >
            <X size={22} className="text-[#171123]" />
          </button>
        </div>

        <div ref={searchRef} className="p-4 border-b border-[#ece7f1]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b2fa5]" size={18} />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowResults(searchResults.length > 0)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#faf9fb] border border-[#e4d6f5] rounded-full text-base text-[#171123] placeholder-[#7c7389] focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]"
              style={{ fontSize: "16px" }}
            />
          </div>

          {showResults && (
            <div className="mt-2 bg-white rounded-lg shadow-lg border border-[#ece7f1] overflow-hidden max-h-64 overflow-y-auto">
              <ResultsList />
            </div>
          )}
        </div>

        <div className="flex flex-col p-6 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="px-4 py-3 text-[#4b4257] hover:text-[#6b2fa5] hover:bg-[#f5f0fb] rounded-lg transition-all duration-300 font-medium"
            >
              {link.label}
            </a>
          ))}

          <div className="pt-6 space-y-3 border-t border-[#ece7f1] mt-4">
            <Link
              href="/auth/login"
              onClick={() => setMenuOpen(false)}
              className="block w-full px-4 py-3 text-center text-[#6b2fa5] font-semibold border border-[#6b2fa5] rounded-full hover:bg-[#f5f0fb] transition-all duration-300"
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              onClick={() => setMenuOpen(false)}
              className="block w-full px-4 py-3 text-center bg-[#6b2fa5] text-white font-semibold rounded-full hover:bg-[#4c2178] transition-all duration-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

export default Navbar
