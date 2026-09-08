// components/OrderDetailsCard.tsx
"use client"

import { Ticket } from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import { deriveMcpFeeBreakdown } from "../lib/derive-fee-breakdown"

interface McpTicketType {
  type: string
  quantity: number
  price: number
}

interface OrderDetailsCardProps {
  ticketTypes: McpTicketType[]
  buyerFullName: string
  buyerEmail: string
  isFree: boolean
  ticketPrice: number
  transactionFee: number
  totalAmount: number
}

export default function OrderDetailsCard({
  ticketTypes,
  buyerFullName,
  buyerEmail,
  isFree,
  ticketPrice,
  transactionFee,
  totalAmount,
}: OrderDetailsCardProps) {
  const { subtotal, platformFee, processingFee, total } = deriveMcpFeeBreakdown({
    ticketPrice,
    transactionFee,
    totalAmount,
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Ticket className="w-4 h-4 text-purple-600" /> Order summary
      </h2>

      <div className="space-y-2.5 text-sm">
        {ticketTypes.map((t, i) => (
          <div key={`${t.type}-${i}`} className="flex justify-between text-gray-600">
            <span>
              {t.type} <span className="text-gray-400">× {t.quantity}</span>
            </span>
            <span className="font-medium text-gray-900">₦{formatNumber(t.price * t.quantity)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Name</span>
          <span className="font-medium text-gray-900">{buyerFullName}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Email</span>
          <span className="font-medium text-gray-900">{buyerEmail}</span>
        </div>
      </div>

      {/* Fee breakdown — every line here always sums to "Amount to pay".
          Platform fee is Spotix's own fee (transactionFee on the
          Reference); Payment processing fee covers Paystack's cut and
          anything else the backend folded into totalAmount. See
          lib/derive-fee-breakdown.ts for why it's computed as a
          reconciling remainder rather than re-derived from a formula. */}
      {!isFree && (
        <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>₦{formatNumber(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Platform fee</span>
            <span>₦{formatNumber(platformFee)}</span>
          </div>
          {processingFee > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Payment processing fee</span>
              <span>₦{formatNumber(processingFee)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-100 mt-1">
            <span>Amount to pay</span>
            <span>₦{formatNumber(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
