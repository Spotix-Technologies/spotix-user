"use client"

import { AlertTriangle } from "lucide-react"
import { INCORRECT_PAYMENT_NOTICE } from "@/utils/paymentMessages"

interface IncorrectAmountStateProps {
  reference: string | null
  message?:  string | null
  onGoHome:  () => void
}

export default function IncorrectAmountState({ reference, message, onGoHome }: IncorrectAmountStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-orange-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">Incorrect Amount Sent</h2>
        <p className="text-gray-600 text-center mb-6">{message ?? INCORRECT_PAYMENT_NOTICE}</p>
        <button
          onClick={onGoHome}
          className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          Back to Home
        </button>
        {reference && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Reference:{" "}
            <span className="font-mono">{reference}</span>
          </p>
        )}
      </div>
    </div>
  )
}
