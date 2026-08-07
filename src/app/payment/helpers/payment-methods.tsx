"use client"

import { Wallet, CreditCard, User, Bitcoin, CheckCircle } from "lucide-react"

interface PaymentMethodsProps {
  selectedMethod: string | null
  walletBalance: number
  isFreeEvent: boolean
  creatingReference: boolean
  isSurveyComplete: boolean
  isSurveyRequired: boolean
  isGuest: boolean
  onSelectMethod: (method: string) => void
  onProceed: () => void
  onSignIn?: () => void
}

const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export default function PaymentMethods({
  selectedMethod,
  walletBalance,
  isFreeEvent,
  creatingReference,
  isSurveyComplete,
  isSurveyRequired,
  isGuest,
  onSelectMethod,
  onProceed,
  onSignIn,
}: PaymentMethodsProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-4 sm:p-6 w-full">
      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
        {isFreeEvent ? "Confirm Registration" : "Select Payment Method"}
      </h3>

      {!isFreeEvent && (
        <div className="space-y-3 sm:space-y-4">
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
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-green-100 flex-shrink-0">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
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

          {/* Paystack */}
          <div
            className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              selectedMethod === "paystack"
                ? "border-purple-500 bg-purple-50 shadow-md"
                : "border-gray-200 hover:border-purple-300 hover:shadow-sm"
            }`}
            onClick={() => onSelectMethod("paystack")}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-blue-100 flex-shrink-0">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-gray-900 break-words">Paystack</h4>
                <p className="text-xs sm:text-sm text-gray-600">Card or bank transfer</p>
              </div>
              {selectedMethod === "paystack" && (
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: "#6b2fa5" }} />
              )}
            </div>
          </div>

          {/* Agent Pay */}
          {/* <div
            className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              selectedMethod === "agent"
                ? "border-purple-500 bg-purple-50 shadow-md"
                : "border-gray-200 hover:border-purple-300 hover:shadow-sm"
            }`}
            onClick={() => onSelectMethod("agent")}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-orange-100 flex-shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-gray-900 break-words">
                  Agent Pay
                  <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-semibold">
                    NEW
                  </span>
                </h4>
                <p className="text-xs sm:text-sm text-gray-600">Pay through verified agents</p>
              </div>
              {selectedMethod === "agent" && (
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: "#6b2fa5" }} />
              )}
            </div>
          </div> */}

          {/* Bitcoin */}
          {/* <div
            className={`p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
              selectedMethod === "bitcoin"
                ? "border-purple-500 bg-purple-50 shadow-md"
                : "border-gray-200 hover:border-purple-300 hover:shadow-sm"
            }`}
            onClick={() => onSelectMethod("bitcoin")}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-yellow-100 flex-shrink-0">
                <Bitcoin className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-gray-900">Bitcoin</h4>
                <p className="text-xs sm:text-sm text-gray-600">Pay with cryptocurrency</p>
              </div>
              {selectedMethod === "bitcoin" && (
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" style={{ color: "#6b2fa5" }} />
              )}
            </div>
          </div> */}
        </div>
      )}

      {/* Survey notice — informational only. The button below stays
          clickable; clicking it opens the registration form in a dialog
          when one is required and hasn't been completed yet, rather than
          disabling the button and forcing the buyer to scroll to find it. */}
      {isSurveyRequired && !isSurveyComplete && (
        <div className="mt-4 p-3 sm:p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
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
        className="w-full mt-4 sm:mt-6 py-3 sm:py-4 text-sm sm:text-base text-white font-bold rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        style={{ background: "#6b2fa5" }}
      >
        {creatingReference ? (
          "Processing..."
        ) : isFreeEvent ? (
          <span className="break-words px-2">
            {isSurveyRequired && !isSurveyComplete ? "Continue to Register" : "Proceed to Register"}
          </span>
        ) : isSurveyRequired && !isSurveyComplete ? (
          <span className="break-words px-2">Continue to Payment</span>
        ) : (
          <span className="break-words px-2">
            Proceed with{" "}
            {selectedMethod === "wallet"
              ? "Wallet Payment"
              : selectedMethod === "paystack"
                ? "Paystack"
                // : selectedMethod === "agent"
                //   ? "Agent Pay"
                //   : selectedMethod === "bitcoin"
                //     ? "Bitcoin"
                    : "Payment"}
          </span>
        )}
      </button>

      <p className="text-center text-xs text-gray-500 mt-3 sm:mt-4 break-words">
        🔒 Your {isFreeEvent ? "information" : "payment information"} is secure and encrypted
      </p>
    </div>
  )
}
