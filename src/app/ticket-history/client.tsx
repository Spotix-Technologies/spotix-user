"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Ticket, Calendar, Clock, RefreshCw, AlertTriangle, SearchIcon, ScanFace, X, ChevronRight, Undo2 } from "lucide-react"
import { ResponsiveSheet } from "@/components/ui/responsive-sheet"
import UserHeader from "../../components/UserHeader"
import Footer from "../../components/footer"
import Link from "next/link"
import { formatNumber } from "@/utils/formatter"

interface TicketHistoryItem {
  id: string
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  ticketId: string
  ticketReference: string
  purchaseDate: string
  purchaseTime: string
  paymentMethod: string
  hasFaceEmbedding?: boolean
}

export default function TicketHistoryClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<TicketHistoryItem[]>([])
  const [filteredTickets, setFilteredTickets] = useState<TicketHistoryItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const [refundSheetOpen, setRefundSheetOpen] = useState(false)

  useEffect(() => {
    fetchTicketHistory()
  }, [])

  const fetchTicketHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const response = await fetch("/api/v1/ticket", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.status === 401) {
        router.push("/auth/login")
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.tickets) {
        const ticketsList: TicketHistoryItem[] = data.tickets.map((ticket: any) => ({
          id: ticket.id,
          eventId: ticket.eventId,
          eventName: ticket.eventName,
          ticketType: ticket.ticketType,
          ticketPrice: ticket.ticketPrice,
          ticketId: ticket.ticketId,
          ticketReference: ticket.ticketReference,
          purchaseDate: ticket.purchaseDate,
          purchaseTime: ticket.purchaseTime,
          paymentMethod: ticket.paymentMethod,
          hasFaceEmbedding: ticket.hasEmbedding === true,
        }))

        setTickets(ticketsList)
        setFilteredTickets(ticketsList)
      }

      setLoading(false)
    } catch (error) {
      console.error("  Error fetching ticket history:", error)
      setLoading(false)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTickets(tickets)
    } else {
      const filtered = tickets.filter((ticket) =>
        ticket.ticketReference.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setFilteredTickets(filtered)
    }
  }, [searchQuery, tickets])

  if (loading) {
    return (
      <div className="flex flex-col min-h-dvh bg-gray-50">
        <UserHeader />
        <div className="w-full bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="h-8 w-44 rounded-lg bg-gray-200 animate-pulse" />
            <div className="mt-3 h-4 w-64 max-w-full rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
        <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6" aria-busy="true" aria-label="Loading your tickets">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 flex gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
                    <div className="h-4 w-1/3 rounded bg-gray-200 animate-pulse" />
                  </div>
                </div>
                <div className="h-16 bg-gray-50" />
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <UserHeader />

      {/* Header Section */}
      <div className="w-full bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Tickets</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage and view all your purchased tickets</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setRefundSheetOpen(true)}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border-2 border-purple-600 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors text-sm"
              >
                <Undo2 size={16} />
                <span className="hidden sm:inline">Refunds</span>
                <span className="sr-only sm:hidden">Refunds</span>
              </button>
              <button
                onClick={() => fetchTicketHistory(true)}
                disabled={refreshing}
                aria-label="Refresh tickets"
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-5">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="search"
              inputMode="search"
              placeholder="Search by ticket reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              // text-base: iOS Safari zooms the page on focus for inputs under 16px
              className="w-full pl-10 pr-10 py-2.5 text-base sm:text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent [&::-webkit-search-cancel-button]:hidden"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {filteredTickets.length} ticket{filteredTickets.length === 1 ? "" : "s"}
            {searchQuery ? " match your search" : ""}
          </p>
        </div>
      </div>

      {/* Refunds — everything that used to sit above the list now lives here */}
      <ResponsiveSheet
        open={refundSheetOpen}
        onClose={() => setRefundSheetOpen(false)}
        size="sm"
        icon={
          <div className="w-10 h-10 rounded-xl bg-purple-100 grid place-items-center">
            <Undo2 size={18} className="text-purple-600" />
          </div>
        }
        title="Refunds"
        description="Request a refund or follow up on one"
      >
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex gap-3">
            <AlertTriangle size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-purple-900">Refund Information</h3>
              <p className="text-sm text-purple-800 mt-1">
                You can request refunds for tickets purchased 2-7 days ago. Use the buttons below to request a refund or
                track existing refund requests.
              </p>
            </div>
          </div>

          <Link
            href="/refund"
            className="flex items-center justify-between gap-3 px-4 py-3.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={18} />
              Request Refund
            </span>
            <ChevronRight size={18} />
          </Link>
          <Link
            href="/refund-track"
            className="flex items-center justify-between gap-3 px-4 py-3.5 bg-white border-2 border-purple-600 text-purple-600 rounded-xl font-medium hover:bg-purple-50 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={18} />
              Track Refunds
            </span>
            <ChevronRight size={18} />
          </Link>
        </div>
      </ResponsiveSheet>

      {/* Tickets Grid */}
      <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/ticket-history/${ticket.id}`}
                className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden border border-gray-100 focus-visible:ring-4 focus-visible:ring-purple-200 outline-none"
              >
                {/* Ticket Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Ticket className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-gray-900 truncate">{ticket.eventName}</h3>
                        {ticket.hasFaceEmbedding && (
                          <ScanFace
                            size={15}
                            className="text-purple-500 flex-shrink-0"
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{ticket.ticketType}</p>
                      <p className="text-base font-medium text-purple-600 mt-1">₦{formatNumber(ticket.ticketPrice)}</p>
                    </div>
                  </div>
                </div>

                {/* Ticket Date/Time */}
                <div className="px-4 py-3 bg-gray-50 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} />
                    <span>{ticket.purchaseDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={16} />
                    <span>{ticket.purchaseTime}</span>
                  </div>
                </div>

                {/* Ticket Footer */}
                <div className="px-4 py-3 flex items-center justify-between bg-white border-t border-gray-100">
                  <div className="text-xs text-gray-500">Ref: {ticket.ticketReference}</div>
                  {ticket.hasFaceEmbedding && (
                    <span className="text-xs text-purple-600 font-medium flex items-center gap-1">
                      <ScanFace size={12} />
                      Face ID
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-gray-100 p-4 rounded-full mb-4">
              <Ticket className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets found</h3>
            {searchQuery ? (
              <p className="text-gray-600 mb-6">No tickets match your search. Try a different reference.</p>
            ) : (
              <p className="text-gray-600 mb-6">You haven't purchased any tickets yet. Browse events to get started!</p>
            )}
            <Link
              href="/home"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Browse Events
            </Link>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}