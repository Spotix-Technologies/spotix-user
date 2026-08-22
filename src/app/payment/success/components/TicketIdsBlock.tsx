interface TicketIdsBlockProps {
  ticketIds: string[]
  isMultiTicket: boolean
  totalTickets: number
}

/**
 * The purple ticket-ID callout at the top of the ticket details card —
 * a single big ID for one ticket, or a numbered list for multiple.
 */
export default function TicketIdsBlock({ ticketIds, isMultiTicket, totalTickets }: TicketIdsBlockProps) {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border-2 border-purple-200">
      <p className="text-sm text-purple-700 font-medium mb-2">
        {isMultiTicket ? `Ticket IDs (${totalTickets})` : "Ticket ID"}
      </p>
      {isMultiTicket ? (
        <div className="space-y-1">
          {ticketIds.map((id, idx) => (
            <p key={id} className="text-sm font-bold text-purple-900 font-mono">
              {idx + 1}. {id}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-2xl font-bold text-purple-900 font-mono">{ticketIds[0]}</p>
      )}
    </div>
  )
}
