"use client"

import { X } from "lucide-react"
import { BRAND_PURPLE } from "../constants"

interface SessionExpiredScreenProps {
  onBackToEvent: () => void
}

export default function SessionExpiredScreen({ onBackToEvent }: SessionExpiredScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-8 text-center w-full max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Session Expired</h2>
        <p className="text-gray-600 mb-6">
          Your payment session has expired or no payment data was found. Please go back to the event page and try
          again.
        </p>
        <button
          onClick={onBackToEvent}
          className="w-full py-3 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg"
          style={{ background: BRAND_PURPLE }}
        >
          Back to Event
        </button>
      </div>
    </div>
  )
}
