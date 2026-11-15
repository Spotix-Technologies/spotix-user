"use client"

import { useState } from "react"
import { ArrowRight, Calendar, Check, Copy, MapPin, Ticket } from "lucide-react"
import { ResponsiveSheet } from "@/components/ui/responsive-sheet"
import { formatNumber } from "@/utils/formatter"
import TicketIdsBlock from "./TicketIdsBlock"
import EventDetailsGrid from "./EventDetailsGrid"
import AttendeeInfoBlock from "./AttendeeInfoBlock"
import StatusBadges from "./StatusBadges"
import ReferenceBlock from "./ReferenceBlock"

interface TicketDetailsCardProps {
  eventName: string
  ticketIds: string[]
  totalTickets: number
  totalAmount: number
  ticketReference: string
  isFreeTicket: boolean
  isMultiTicket: boolean
  discountApplied: boolean
  referralUsed: boolean
  buyerInfo: { fullName: string; email: string; isGuest: boolean }
  eventDetails: { eventDate: string; eventStart: string; eventEnd: string; eventVenue: string }
}

/**
 * Compact order summary shown on the success page — event, ticket count,
 * amount and reference at a glance — with a "View full summary" button that
 * opens everything else (ticket IDs, event details, attendee info, status
 * badges, reference) in a bottom sheet on phones / side drawer on desktop.
 *
 * This keeps the QR codes and the download button near the top of the page
 * instead of burying them under a long details card, while every detail that
 * used to be on the page is still one tap away.
 */
export default function TicketDetailsCard({
  eventName,
  ticketIds,
  totalTickets,
  totalAmount,
  ticketReference,
  isFreeTicket,
  isMultiTicket,
  discountApplied,
  referralUsed,
  buyerInfo,
  eventDetails,
}: TicketDetailsCardProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(ticketReference)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard blocked — the reference is still visible to copy by hand */
    }
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-5 sm:p-6 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-purple-200 text-sm mb-1">Event</p>
              <h2 className="text-xl sm:text-2xl font-bold break-words">{eventName}</h2>
            </div>
            <Ticket className="w-10 h-10 sm:w-12 sm:h-12 opacity-50 flex-shrink-0" />
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-3">
              <dt className="text-xs font-semibold text-purple-700">Tickets</dt>
              <dd className="mt-0.5 text-lg font-bold text-purple-900">{totalTickets}</dd>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-3">
              <dt className="text-xs font-semibold text-purple-700">{isFreeTicket ? "Price" : "Amount paid"}</dt>
              <dd className="mt-0.5 text-lg font-bold text-purple-900">
                {isFreeTicket ? "Free" : `₦${formatNumber(totalAmount)}`}
              </dd>
            </div>
          </dl>

          <div className="space-y-2 text-sm text-gray-700">
            <p className="flex items-start gap-2">
              <Calendar size={16} className="mt-0.5 flex-shrink-0 text-purple-500" />
              <span>
                {eventDetails.eventDate ? new Date(eventDetails.eventDate).toLocaleDateString() : "TBA"}
                {eventDetails.eventStart ? ` · ${eventDetails.eventStart}${eventDetails.eventEnd ? ` – ${eventDetails.eventEnd}` : ""}` : ""}
              </span>
            </p>
            {eventDetails.eventVenue && (
              <p className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 flex-shrink-0 text-purple-500" />
                <span className="break-words">{eventDetails.eventVenue}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">{isFreeTicket ? "Registration reference" : "Payment reference"}</p>
              <p className="text-sm font-mono text-gray-900 truncate">{ticketReference}</p>
            </div>
            <button
              type="button"
              onClick={copyReference}
              aria-label="Copy reference"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-purple-200 bg-white py-3 text-sm font-bold text-purple-700 hover:bg-purple-50 transition-colors"
          >
            View full ticket summary
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <ResponsiveSheet
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        icon={
          <div className="w-10 h-10 rounded-xl bg-[#6b2fa5]/10 grid place-items-center">
            <Ticket size={18} className="text-[#6b2fa5]" />
          </div>
        }
        title="Ticket summary"
        description={<span className="block truncate">{eventName}</span>}
      >
        <div className="space-y-5">
          <TicketIdsBlock ticketIds={ticketIds} isMultiTicket={isMultiTicket} totalTickets={totalTickets} />

          <EventDetailsGrid
            totalTickets={totalTickets}
            totalAmount={totalAmount}
            isFreeTicket={isFreeTicket}
            eventDate={eventDetails.eventDate}
            eventStart={eventDetails.eventStart}
            eventEnd={eventDetails.eventEnd}
            eventVenue={eventDetails.eventVenue}
          />

          <AttendeeInfoBlock fullName={buyerInfo.fullName} email={buyerInfo.email} isGuest={buyerInfo.isGuest} />

          <StatusBadges isFreeTicket={isFreeTicket} discountApplied={discountApplied} referralUsed={referralUsed} />

          <ReferenceBlock isFreeTicket={isFreeTicket} ticketReference={ticketReference} />
        </div>
      </ResponsiveSheet>
    </>
  )
}
