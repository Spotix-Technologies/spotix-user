"use client"

import { formatNumber } from "@/utils/formatter"
import { getTicketSaleStatus, describeSaleStatus } from "@/utils/ticketSaleWindow"
import type { EventType } from "../page"

interface TicketSummaryCardProps {
  eventData: EventType
}

export const TicketSummaryCard: React.FC<TicketSummaryCardProps> = ({ eventData }) => {
  const eventWideStop = { enabled: !!eventData.enableStopDate, stopDate: eventData.stopDate }
  const tickets = eventData.ticketPrices ?? []
  // Prices can arrive as strings from Firestore — always coerce before comparing.
  const lowest = tickets.length ? Math.min(...tickets.map((t) => Number(t.price) || 0)) : 0
  const showSalesEnd = eventData.enableStopDate && eventData.stopDate

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      {eventData.isFree ? (
        <p className="text-3xl font-semibold tracking-tight text-gray-900">Free</p>
      ) : (
        <div>
          <p className="text-sm text-gray-500">Starting from</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">₦{formatNumber(lowest)}</p>
        </div>
      )}

      {!eventData.isFree && tickets.length > 0 && (
        <ul className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
          {tickets.map((ticket, index) => {
            // Never a sold/remaining count — only whether this type is
            // purchasable right now and, if not, why.
            const saleStatus = getTicketSaleStatus(ticket, eventWideStop)
            return (
              <li key={index} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-900">{ticket.policy}</span>
                  {!saleStatus.onSale && (
                    <span
                      className={`mt-1 block w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${
                        saleStatus.reason === "not-started"
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-red-200 bg-red-50 text-red-600"
                      }`}
                    >
                      {describeSaleStatus(saleStatus)}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-sm font-semibold text-gray-900">₦{formatNumber(ticket.price)}</span>
              </li>
            )
          })}
        </ul>
      )}

      {/* Only rendered when there is something to show (no empty box). */}
      {showSalesEnd && (
        <p className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-sm">
          <span className="text-gray-500">Sales end</span>
          <span className="font-medium text-gray-900">{new Date(eventData.stopDate!).toLocaleDateString()}</span>
        </p>
      )}
    </div>
  )
}
