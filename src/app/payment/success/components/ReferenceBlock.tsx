interface ReferenceBlockProps {
  isFreeTicket: boolean
  ticketReference: string
}

/** The grey payment/registration reference footer on the ticket details card. */
export default function ReferenceBlock({ isFreeTicket, ticketReference }: ReferenceBlockProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <p className="text-sm text-gray-600 mb-1">
        {isFreeTicket ? "Registration Reference" : "Payment Reference"}
      </p>
      <p className="text-sm font-mono text-gray-900 break-all">{ticketReference}</p>
    </div>
  )
}
