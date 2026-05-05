"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Ticket, Calendar, Clock, RefreshCw, AlertTriangle, SearchIcon, ScanFace } from "lucide-react"
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

  const handleTicketClick = (ticketId: string) => {
    router.push(`/ticket-history/${ticketId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your tickets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <UserHeader />

      {/* Header Section */}
      <div className="w-full bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
              <p className="text-gray-600 mt-1">Manage and view all your purchased tickets</p>
            </div>
            <button
              onClick={() => fetchTicketHistory(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/refund"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <AlertTriangle size={18} />
              Request Refund
            </Link>
            <Link
              href="/refund-track"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-purple-600 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors"
            >
              <RefreshCw size={18} />
              Track Refunds
            </Link>
          </div>

          {/* Info Banner */}
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg flex gap-3">
            <AlertTriangle size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-purple-900">Refund Information</h3>
              <p className="text-sm text-purple-800 mt-1">
                You can request refunds for tickets purchased 2-7 days ago. Use the buttons above to request a refund or
                track existing refund requests.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by ticket reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => handleTicketClick(ticket.id)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer overflow-hidden border border-gray-100"
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
                            title="Face ID registered"
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
              </div>
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
