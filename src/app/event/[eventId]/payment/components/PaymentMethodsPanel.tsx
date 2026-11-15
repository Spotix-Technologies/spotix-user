"use client"

import { Wallet, CheckCircle, FileText, Lock, ChevronRight } from "lucide-react"
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
 * Apple devices) Apple Pay — mirroring spotix-vote's payment-channels
 * pattern. Each channel selection is forwarded straight to
 * PayWithPaystack's `channels` option so Paystack's checkout skips
 * directly to that method.
 *
 * On phones the Proceed button lives in a bar pinned to the bottom of the
 * screen together with the amount due, so the buyer never has to scroll
 * past the order summary / discount cards to find it. From `lg` up it sits
 * inside the card like before.
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
  const walletShort = !isGuest && selectedMethod === "wallet" && walletBalance < totalAmount

  const proceedLabel = () => {
    if (isFreeEvent) return isSurveyRequired && !isSurveyComplete ? "Continue to Register" : "Proceed to Register"
    if (isSurveyRequired && !isSurveyComplete) return "Continue to Payment"
    if (selectedMethod === "wallet") return "Proceed with Wallet Payment"
    if (chosenChannel) return `Proceed with ${chosenChannel.label}`
    return "Select a payment method"
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-4 sm:p-6 lg:p-8 w-full">
      <div className="mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
          {isFreeEvent ? "Confirm Registration" : "Select Payment Method"}
        </h3>
        {!isFreeEvent && (
          <p className="text-sm text-gray-500 mt-1">Pick how you'd like to pay. You can't be charged until you confirm.</p>
        )}
      </div>

      {!isFreeEvent && (
        <div className="space-y-5">
          {/* Wallet */}
          <div
            role="radio"
            aria-checked={selectedMethod === "wallet"}
            aria-disabled={isGuest}
            tabIndex={isGuest ? -1 : 0}
            onKeyDown={(e) => {
              if (!isGuest && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault()
                onSelectMethod("wallet")
              }
            }}
            className={`p-3 sm:p-4 rounded-xl border-2 outline-none focus-visible:ring-4 focus-visible:ring-purple-100 ${
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
                      onClick={(e) => {
                        e.stopPropagation()
                        onSignIn?.()
                      }}
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
            {walletShort && (
              <p className="mt-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Your wallet balance is lower than this order's total (₦{formatNumber(totalAmount)}). Pick another method or top up first.
              </p>
            )}
          </div>

          {/* Paystack channels */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Or pay with</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
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

      {/* Proceed — pinned bottom bar on phones, inline from lg up */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur px-4 pt-3 shadow-[0_-8px_24px_rgba(17,24,39,0.08)] lg:static lg:z-auto lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto w-full max-w-3xl lg:max-w-none">
          <div className="mb-2 flex items-baseline justify-between lg:hidden">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {isFreeEvent ? "Registration" : "Total to pay"}
            </span>
            <span className="text-lg font-extrabold" style={{ color: "#6b2fa5" }}>
              {isFreeEvent ? "Free" : `₦${formatNumber(totalAmount)}`}
            </span>
          </div>

          <button
            onClick={onProceed}
            disabled={(!selectedMethod && !isFreeEvent) || creatingReference}
            className="w-full py-3.5 sm:py-4 text-sm sm:text-base text-white font-bold rounded-xl transition-all duration-200 hover:opacity-90 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "#6b2fa5" }}
          >
            {creatingReference ? (
              "Processing..."
            ) : (
              <>
                <span className="break-words">{proceedLabel()}</span>
                {(selectedMethod || isFreeEvent) && <ChevronRight size={18} className="flex-shrink-0" />}
              </>
            )}
          </button>

          <p className="hidden lg:flex items-center justify-center gap-1.5 text-center text-xs text-gray-500 mt-4">
            <Lock size={12} />
            Your {isFreeEvent ? "information" : "payment information"} is secure and encrypted
          </p>
        </div>
      </div>

      {/* Mobile version of the security note — sits in the card, above the pinned bar */}
      <p className="lg:hidden flex items-center justify-center gap-1.5 text-center text-xs text-gray-500 mt-4">
        <Lock size={12} />
        Your {isFreeEvent ? "information" : "payment information"} is secure and encrypted
      </p>
    </div>
  )
}
