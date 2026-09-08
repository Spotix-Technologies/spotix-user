"use client"

import { Ticket } from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import { getTicketSaleStatus, describeSaleStatus } from "@/utils/ticketSaleWindow"
import type { EventType } from "../page"

interface TicketSummaryCardProps {
  eventData: EventType
}

export const TicketSummaryCard: React.FC<TicketSummaryCardProps> = ({ eventData }) => {
  const eventWideStop = { enabled: !!eventData.enableStopDate, stopDate: eventData.stopDate }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 border-purple-100">
      <div className="mb-6">
        {eventData.isFree ? (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full shadow-lg mb-4">
              <Ticket size={24} />
              <span className="text-2xl font-bold">FREE EVENT</span>
            </div>
          </div>
        ) : (
          <div className="text-center mb-4">
            <p className="text-gray-600 mb-2">Starting from</p>
            <p className="text-4xl font-bold text-[#6b2fa5]">
              ₦
              {formatNumber(
                eventData.ticketPrices?.length
                  ? Math.min(...eventData.ticketPrices.map((t) => t.price))
                  : 0
              )}
            </p>
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-4">Get Your Tickets</h3>

      {!eventData.isFree && eventData.ticketPrices?.length > 0 && (
        <div className="mb-6 space-y-3">
          <p className="text-sm font-medium text-gray-600 mb-2">Ticket Options:</p>
          {eventData.ticketPrices.map((ticket, index) => {
            // Surfaced here for consistency with the buy dialog — never a
            // sold/remaining count, just whether this type is currently
            // purchasable and, if not, why.
            const saleStatus = getTicketSaleStatus(ticket, eventWideStop)
            return (
              <div
                key={index}
                className="flex justify-between items-center p-3 bg-purple-50 rounded-lg gap-3"
              >
                <div className="min-w-0">
                  <span className="font-medium text-gray-800">{ticket.policy}</span>
                  {!saleStatus.onSale && (
                    <span
                      className={`block mt-1 w-fit text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        saleStatus.reason === "not-started"
                          ? "text-amber-700 bg-amber-50 border-amber-200"
                          : "text-red-600 bg-red-50 border-red-200"
                      }`}
                    >
                      {describeSaleStatus(saleStatus)}
                    </span>
                  )}
                </div>
                <span className="font-bold text-[#6b2fa5] flex-shrink-0">₦{formatNumber(ticket.price)}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="space-y-3 mb-6 p-4 bg-gray-50 rounded-lg">
        {/* NOTE: a "Tickets Sold: X / maxSize" line used to live here.
            Removed intentionally — once a booker has capped how many
            tickets can be sold, the exact sold/remaining count is no
            longer shown to buyers (same reasoning as hiding the "Only N
            left!" badge in buy-ticket-dialog.tsx). "Sold out" itself
            still shows via the dialog's binary status when it applies. */}
        {eventData.enableStopDate && eventData.stopDate && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Sales End:</span>
            <span className="font-semibold text-gray-900">
              {new Date(eventData.stopDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

