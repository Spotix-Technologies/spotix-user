// app/payment/helpers/order-summary.tsx

"use client"

import { CheckCircle, Ticket } from "lucide-react"
import { getPricingBreakdown } from "@/utils/priceUtility"
import { formatNumber } from "@/utils/formatter"

interface CartItem {
  ticketType: string
  quantity: number
  price: number
}

interface OrderSummaryProps {
  eventName: string
  cart: CartItem[]
  discountAmount: number
  discountData: {
    code: string
    discountType: "percentage" | "fixed"
    discountValue: number
  } | null
  isFreeEvent: boolean
}

export default function OrderSummary({
  eventName,
  cart,
  discountAmount,
  discountData,
  isFreeEvent,
}: OrderSummaryProps) {
  // Use priceUtility to get the breakdown for every cart item
  const pricedCart = cart.map((item) => {
    const { originalPrice, vatFee, finalPrice } = getPricingBreakdown(item.price)
    return { ...item, originalPrice, vatFee, finalPrice }
  })

  const subtotal = pricedCart.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0)
  const totalVat = pricedCart.reduce((sum, item) => sum + item.vatFee * item.quantity, 0)
  const computedTotal = Math.max(0, subtotal + totalVat - (discountAmount ?? 0))

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-4 sm:p-6 w-full">
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "#f3e8ff" }}
        >
          <CheckCircle size={16} style={{ color: "#6b2fa5" }} />
        </div>
        <span className="break-words">Order Summary</span>
      </h3>

      <div className="space-y-3">
        {/* Event Name */}
        <div className="p-3 sm:p-4 bg-purple-50 rounded-xl border border-purple-100">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">Event</p>
          <p className="font-bold text-sm sm:text-base text-gray-900 break-words">{eventName}</p>
        </div>

        {/* Ticket Line Items */}
        <div className="p-3 sm:p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-2">
          <p className="text-xs sm:text-sm text-gray-600 mb-2">
            {`Tickets (${cart.reduce((sum, i) => sum + i.quantity, 0)} total)`}
          </p>
          {isFreeEvent ? (
            pricedCart.map((item, index) => (
              <div key={index} className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Ticket size={14} className="text-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 break-words">{item.ticketType}</p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-gray-500">× {item.quantity}</p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-emerald-600 whitespace-nowrap">Free</span>
              </div>
            ))
          ) : (
            pricedCart.map((item, index) => (
              <div key={index} className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <Ticket size={14} className="text-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 break-words">{item.ticketType}</p>
                    <p className="text-xs text-gray-500">
                      ₦{formatNumber(item.originalPrice)} × {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                  ₦{formatNumber(item.originalPrice * item.quantity)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Price Breakdown */}
        <div className="pt-4 border-t border-gray-200 space-y-2">
          {!isFreeEvent && (
            <>
              <div className="flex justify-between text-sm sm:text-base text-gray-700">
                <span>Subtotal</span>
                <span className="font-semibold whitespace-nowrap">₦{formatNumber(subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm sm:text-base text-gray-700">
                <span>VAT & Fees</span>
                <span className="font-semibold whitespace-nowrap">₦{formatNumber(totalVat)}</span>
              </div>
            </>
          )}

          {discountData && !isFreeEvent && (
            <div className="flex justify-between text-sm sm:text-base text-green-600 font-medium">
              <span className="break-words pr-2">
                Discount ({discountData.discountType === "percentage" ? `${discountData.discountValue}%` : "Fixed"})
              </span>
              <span className="whitespace-nowrap">-₦{formatNumber(discountAmount)}</span>
            </div>
          )}

          <div
            className="flex justify-between pt-3 border-t border-gray-300 text-base sm:text-lg font-bold"
            style={{ color: "#6b2fa5" }}
          >
            <span>Total Amount</span>
            <span className="whitespace-nowrap">
              {isFreeEvent ? "Free" : `₦${formatNumber(computedTotal)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}