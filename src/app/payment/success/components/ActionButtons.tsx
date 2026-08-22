import { ArrowRight, Ticket } from "lucide-react"

interface ActionButtonsProps {
  isMultiTicket: boolean
  onViewTicket: () => void
  onViewTickets: () => void
}

/** "View First Ticket" / "View All Tickets" button pair. */
export default function ActionButtons({ isMultiTicket, onViewTicket, onViewTickets }: ActionButtonsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-4 mb-6">
      <button
        onClick={onViewTicket}
        className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-purple-800 text-white font-bold rounded-xl hover:from-purple-700 hover:to-purple-900 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
      >
        <Ticket size={20} />
        {isMultiTicket ? "View First Ticket" : "View Ticket Details"}
        <ArrowRight size={20} />
      </button>
      <button
        onClick={onViewTickets}
        className="w-full py-4 px-6 bg-white border-2 border-purple-600 text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-all flex items-center justify-center gap-2"
      >
        <Ticket size={20} />
        View All Tickets
      </button>
    </div>
  )
}
