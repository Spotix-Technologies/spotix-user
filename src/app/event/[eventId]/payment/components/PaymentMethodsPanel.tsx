"use client"

import { Wallet, CheckCircle, FileText } from "lucide-react"
import type { PaymentMethodId } from "@/lib/paystack/payment-channels"
import { findPaymentMethod } from "@/lib/paystack/payment-channels"
import PaymentMethodPicker from "./PaymentMethodPicker"

const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export type SelectedMethod = "wallet" | PaymentMethodId | null

interface PaymentMethodsPanelProps {
  selectedMethod: SelectedMethod
  walletBalance: number
  isFreeEvent: boolean
  creatingReference: boolean
  isSurveyComplete: boolean
  isSurveyRequired: boolean
  isGuest: boolean
  totalAmount: number
  onSelectMethod: (method: SelectedMethod) => void
  onProceed: () => void
  onSignIn?: () => void
}

/**
 * Replaces the old helpers/payment-methods.tsx card list (Wallet + a
 * single generic "Paystack" button) with Wallet plus a real spread of
 * Paystack channels — Card, Bank Transfer, USSD, Mobile Money, and (on
 * Apple devices, greyed out) Apple Pay — mirroring spotix-vote's
 * payment-channels pattern. Each channel selection is forwarded straight
 * to PayWithPaystack's `channels` option so Paystack's checkout skips
 * directly to that method.
 */
export default function PaymentMethodsPanel({
  selectedMethod,
  walletBalance,
  isFreeEvent,
  creatingReference,
  isSurveyComplete,
  isSurveyRequired,
  isGuest,
  totalAmount,
  onSelectMethod,
  onProceed,
  onSignIn,
}: PaymentMethodsPanelProps) {
  const isChannelMethod = !!selectedMethod && selectedMethod !== "wallet"
  const chosenChannel = isChannelMethod ? findPaymentMethod(selectedMethod as PaymentMethodId) : null

  const proceedLabel = () => {
    if (isFreeEvent) return isSurveyRequired && !isSurveyComplete ? "Continue to Register" : "Proceed to Register"
    if (isSurveyRequired && !isSurveyComplete) return "Continue to Payment"
    if (selectedMethod === "wallet") return "Proceed with Wallet Payment"
    if (chosenChannel) return `Proceed with ${chosenChannel.label}`
    return "Payment"
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-4 sm:p-6 lg:p-8 w-full">
      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
        {isFreeEvent ? "Confirm Registration" : "Select Payment Method"}
      </h3>

      {!isFreeEvent && (
        <div className="space-y-5">
          {/* Wallet */}
          <div
            className={`p-3 sm:p-4 rounded-xl border-2 ${
              isGuest
                ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                : `cursor-pointer transition-all duration-200 ${
                    selectedMethod === "wallet"
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : "border-gray-200 hover:border-purple-300 hover:shadow-sm"
                  }`
            }`}
            onClick={() => !isGuest && onSelectMethod("wallet")}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-purple-100 flex-shrink-0">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: "#6b2fa5" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-gray-900">My Wallet</h4>
                {isGuest ? (
                  <p className="text-xs sm:text-sm text-gray-600 break-words">
                    <button
                      onClick={onSignIn}
                      className="text-purple-600 hover:text-purple-700 font-semibold underline"
                    >
                      Login to view wallet
                    </button>
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-600 break-words">Balance: ₦{formatNumber(walletBalance)}</p>
                )}
              </div>
              {selectedMethod === "wallet" && !isGuest && (
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: "#6b2fa5" }} />
              )}
            </div>
          </div>

          {/* Paystack channels */}
          <div>
            {/* <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Or pay with Paystack</p> */}
            <PaymentMethodPicker
              selectedMethod={isChannelMethod ? (selectedMethod as PaymentMethodId) : null}
              onSelect={(id) => onSelectMethod(id)}
            />
          </div>
        </div>
      )}

      {/* Survey notice */}
      {isSurveyRequired && !isSurveyComplete && (
        <div className="mt-4 p-3 sm:p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Form Required</p>
              <p className="text-xs text-amber-700 mt-1">
                You'll be asked to complete a short registration form when you continue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Proceed Button */}
      <button
        onClick={onProceed}
        disabled={(!selectedMethod && !isFreeEvent) || creatingReference}
        className="w-full mt-4 sm:mt-6 py-3 sm:py-4 text-sm sm:text-base text-white font-bold rounded-xl transition-all duration-200 hover:opacity-90 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "#6b2fa5" }}
      >
        {creatingReference ? "Processing..." : <span className="break-words px-2">{proceedLabel()}</span>}
      </button>

      <p className="text-center text-xs text-gray-500 mt-3 sm:mt-4 break-words">
        🔒 Your {isFreeEvent ? "information" : "payment information"} is secure and encrypted
      </p>
    </div>
  )
}
