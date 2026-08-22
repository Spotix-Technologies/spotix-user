interface EventDetailsGridProps {
  totalTickets: number
  totalAmount: number
  isFreeTicket: boolean
  eventDate: string
  eventStart: string
  eventEnd: string
  eventVenue: string
}

/**
 * Tickets purchased / amount paid / date / time / venue grid on the
 * ticket details card.
 */
export default function EventDetailsGrid({
  totalTickets,
  totalAmount,
  isFreeTicket,
  eventDate,
  eventStart,
  eventEnd,
  eventVenue,
}: EventDetailsGridProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <p className="text-sm text-gray-600 mb-1">Tickets Purchased</p>
        <p className="text-lg font-bold text-gray-900">{totalTickets}</p>
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
        <p className="text-lg font-bold text-gray-900">
          {isFreeTicket ? "FREE" : `₦${totalAmount.toLocaleString()}`}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-1">Date</p>
        <p className="text-lg font-semibold text-gray-900">
          {eventDate ? new Date(eventDate).toLocaleDateString() : "TBA"}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-1">Time</p>
        <p className="text-lg font-semibold text-gray-900">
          {eventStart} – {eventEnd}
        </p>
      </div>
      <div className="md:col-span-2">
        <p className="text-sm text-gray-600 mb-1">Venue</p>
        <p className="text-lg font-semibold text-gray-900">{eventVenue}</p>
      </div>
    </div>
  )
}
