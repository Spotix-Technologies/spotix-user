import { CheckCircle } from "lucide-react"

interface WhatsNextCardProps {
  buyerEmail: string
  bookerEmail: string
  isMultiTicket: boolean
}

/**
 * The "What's Next?" checklist. Previously a blue info panel — moved to
 * the brand purple accent so it reads as part of the same design system
 * as the rest of the checkout/success flow instead of an unrelated blue.
 */
export default function WhatsNextCard({ buyerEmail, bookerEmail, isMultiTicket }: WhatsNextCardProps) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-6 h-6" style={{ color: "#6b2fa5" }} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-purple-900 mb-2">What&apos;s Next?</h3>
          <ul className="space-y-2 text-purple-900/90">
            <li className="flex items-start gap-2">
              <span style={{ color: "#6b2fa5" }} className="mt-1">✓</span>
              <span>
                A confirmation email has been sent to <span className="font-semibold">{buyerEmail}</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "#6b2fa5" }} className="mt-1">✓</span>
              <span>Your ticket{isMultiTicket ? "s are" : " is"} now available in your ticket history</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "#6b2fa5" }} className="mt-1">✓</span>
              <span>Present your QR code{isMultiTicket ? "s" : ""} at the event entrance for verification</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: "#6b2fa5" }} className="mt-1">✓</span>
              <span>
                For questions, contact: <span className="font-semibold">{bookerEmail}</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
