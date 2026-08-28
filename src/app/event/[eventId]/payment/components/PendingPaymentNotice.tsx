"use client"

import { Clock, RotateCcw } from "lucide-react"
import { BRAND_PURPLE } from "../constants"

interface PendingPaymentNoticeProps {
  reference: string
  totalAmount: number
  checking: boolean
  /**
   * False when we don't have enough identity (buyer email) to safely
   * reopen the Paystack widget for this reference — happens only for a
   * guest checkout whose sessionStorage didn't survive, since we
   * deliberately don't recover guest PII from the (public,
   * unauthenticated) status endpoint. Automatic status polling still
   * works either way; this just hides the manual "reopen" action.
   */
  canReopen: boolean
  onCompletePayment: () => void
  onStartFresh: () => void
}

const formatNaira = (num: number): string => `₦${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`

/**
 * Shown instead of the normal payment-method picker when the checkout
 * page was reopened with a `?ref=` that's still pending — i.e. the buyer
 * left mid-payment and came back. The amount here is the reference's own
 * confirmed total (not recomputed from cart/discount), and "Complete
 * Payment" reopens that exact same reference rather than minting a new
 * one — see EventPaymentClient's resumedReference handling.
 */
export default function PendingPaymentNotice({
  reference,
  totalAmount,
  checking,
  canReopen,
  onCompletePayment,
  onStartFresh,
}: PendingPaymentNoticeProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-4 sm:p-6 lg:p-8 w-full">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 flex-shrink-0">
          <Clock className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Payment In Progress</h3>
          <p className="text-sm text-gray-600 mt-1">
            We found a payment you started for an order with reference: <span className="font-mono">{reference}</span>.
            {checking ? " Checking for confirmation…" : " We'll update this page automatically once our system confirms the payment."}
          </p>
        </div>
      </div>

      <div className="p-3 sm:p-4 bg-purple-50 rounded-xl border border-purple-100 mb-5 flex items-center justify-between">
        <span className="text-sm text-gray-600">Amount due</span>
        <span className="text-lg font-bold text-gray-900">{formatNaira(totalAmount)}</span>
      </div>

      {canReopen ? (
        <button
          onClick={onCompletePayment}
          className="w-full py-3 sm:py-4 text-sm sm:text-base text-white font-bold rounded-xl transition-all duration-200 hover:opacity-90 shadow-lg hover:shadow-xl"
          style={{ background: BRAND_PURPLE }}
        >
          Complete Payment
        </button>
      ) : (
        <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-600 text-center">
          We're checking the status of this payment. This page will automatically update once our system confirms the payment.
        </div>
      )}

      <button
        onClick={onStartFresh}
        className="w-full mt-3 py-2.5 text-sm text-gray-600 font-medium rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
      >
        <RotateCcw size={14} />
        This wasn't me. Start a new payment
      </button>

      <p className="text-center text-xs text-gray-500 mt-3 sm:mt-4">
        🔒 Discount and referral codes are locked while resuming a payment already in progress.
      </p>
    </div>
  )
}
