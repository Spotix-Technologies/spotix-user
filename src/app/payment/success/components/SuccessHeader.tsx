import { CheckCircle } from "lucide-react"

interface SuccessHeaderProps {
  isFreeTicket: boolean
  isMultiTicket: boolean
  totalTickets: number
}

/**
 * Top banner on the success page — the bouncing checkmark plus the
 * "Payment Successful!" / "Registration Successful!" headline. Split out
 * of PaystackSuccessClient.tsx, no behavior change.
 */
export default function SuccessHeader({ isFreeTicket, isMultiTicket, totalTickets }: SuccessHeaderProps) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 text-center">
      <div className="flex justify-center mb-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
        {isFreeTicket ? "Registration Successful!" : "Payment Successful!"}
      </h1>
      <p className="text-lg text-gray-600">
        {isMultiTicket ? `${totalTickets} tickets have been generated` : "Your ticket has been generated"}
      </p>
    </div>
  )
}
