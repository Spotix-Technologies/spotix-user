import { Ticket } from "lucide-react"
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
 * The full white card with the purple header, ticket ID(s), event
 * details, attendee info, status badges, and payment reference — the
 * bulk of what used to be inline JSX in PaystackSuccessClient.tsx,
 * now composed from smaller focused pieces.
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
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-sm mb-1">Event</p>
            <h2 className="text-2xl font-bold">{eventName}</h2>
          </div>
          <Ticket className="w-12 h-12 opacity-50" />
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
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
    </div>
  )
}
