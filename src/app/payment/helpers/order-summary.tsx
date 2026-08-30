// app/payment/helpers/order-summary.tsx

"use client"

import { CheckCircle, Ticket } from "lucide-react"
import { resolvePlatformFeeRates, calculateVATFee, type OrderPricingBreakdown } from "@/utils/priceUtility"
import { formatNumber } from "@/utils/formatter"

interface CartItem {
  ticketType: string
  quantity: number
  price: number
  /** Fee already computed at add-to-cart time using the event's actual
   *  (possibly admin-customised) fee rates. Preferred over recomputing
   *  here, since this component has no access to the event doc. */
  vat?: number
}

interface OrderSummaryProps {
  eventName: string
  cart: CartItem[]
  discountAmount: number
  discountData: {
    code: string
    discountType: "percentage" | "flat"
    discountValue: number
  } | null
  isFreeEvent: boolean
  /** Full fee/addon/burden breakdown from computeOrderPricing — pass null
   *  while resuming a pending reference (that total is pinned server-side
   *  and shown separately), in which case this falls back to a plain
   *  ticket-price + Spotix-fee display, same as before this existed. */
  orderPricing?: OrderPricingBreakdown | null
}

export default function OrderSummary({
  eventName,
  cart,
  discountAmount,
  discountData,
  isFreeEvent,
  orderPricing = null,
}: OrderSummaryProps) {
  // Each cart item already carries its own `.vat`, computed at add-to-cart
  // time using the event's actual (possibly admin-customised) fee rates —
  // trust that instead of recomputing from a formula this component has no
  // way to know the right rates for. The recompute is only a fallback for
  // the rare item that somehow reached here without one already set.
  const fallbackRates = resolvePlatformFeeRates(null)
  const pricedCart = cart.map((item) => {
    const vatFee = typeof item.vat === "number" ? item.vat : calculateVATFee(item.price, fallbackRates)
    return { ...item, originalPrice: item.price, vatFee, finalPrice: item.price + vatFee }
  })

  const subtotal = pricedCart.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0)
  const totalVat = pricedCart.reduce((sum, item) => sum + item.vatFee * item.quantity, 0)
  const isTrulyFree = isFreeEvent || subtotal === 0

  // Whenever a full breakdown is available, it's the source of truth for
  // the total (Spotix fee + Paystack fee + addons, all burden-aware).
  // Otherwise fall back to the simpler subtotal + Spotix-fee-only total
  // this component always showed before Paystack fee/addons existed.
  const computedTotal = orderPricing
    ? orderPricing.totalPayable
    : Math.max(0, subtotal + totalVat - (discountAmount ?? 0))

  // Show a line-itemised breakdown whenever there's more than one thing
  // making up the fee — i.e. as soon as burden or addons are in play.
  const showFeeBreakdown =
    !!orderPricing &&
    (orderPricing.buyerOwesSpotixFee ||
      orderPricing.buyerOwesPaystackFee ||
      orderPricing.addonFeeTotal > 0 ||
      orderPricing.spotixFeeTotal > 0 ||
      orderPricing.paystackFeeTotal > 0)

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
          {isTrulyFree ? (
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
          {!isTrulyFree && (
            <>
              <div className="flex justify-between text-sm sm:text-base text-gray-700">
                <span>Subtotal</span>
                <span className="font-semibold whitespace-nowrap">
                  ₦{formatNumber(orderPricing ? orderPricing.ticketSubtotal : subtotal)}
                </span>
              </div>

              {showFeeBreakdown && orderPricing ? (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Fee breakdown</p>

                  <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                    <span>Spotix platform fee</span>
                    <span className="whitespace-nowrap">
                      {orderPricing.buyerOwesSpotixFee ? `₦${formatNumber(orderPricing.spotixFeeTotal)}` : "Covered by organizer"}
                    </span>
                  </div>

                  <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                    <span>Paystack processing fee</span>
                    <span className="whitespace-nowrap">
                      {orderPricing.buyerOwesPaystackFee ? `₦${formatNumber(orderPricing.paystackFeeChargedToBuyer)}` : "Covered by organizer"}
                    </span>
                  </div>

                  {orderPricing.addonFeeTotal > 0 && (
                    <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                      <span>Addons</span>
                      <span className="whitespace-nowrap">₦{formatNumber(orderPricing.addonFeeTotal)}</span>
                    </div>
                  )}

                  <a href="#" className="inline-block text-xs text-purple-600 hover:underline mt-1">
                    What are these fees?
                  </a>
                </div>
              ) : (
                <div className="flex justify-between text-sm sm:text-base text-gray-700">
                  <span>VAT & Fees</span>
                  <span className="font-semibold whitespace-nowrap">₦{formatNumber(totalVat)}</span>
                </div>
              )}
            </>
          )}

          {discountData && !isTrulyFree && (
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
              {isTrulyFree ? "Free" : `₦${formatNumber(computedTotal)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}