"use client"

import { X } from "lucide-react"
import { BRAND_PURPLE } from "../constants"

interface QueueExpiredScreenProps {
  onRejoinQueue: () => void
}

export default function QueueExpiredScreen({ onRejoinQueue }: QueueExpiredScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-8 text-center w-full max-w-md mx-auto">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Checkout Window Expired</h2>
        <p className="text-gray-600 mb-6">
          Demand for this event is high, so checkout slots are time-limited. Your spot was passed on to the next
          person in line. You may rejoin the queue to get a new one.
        </p>
        <button
          onClick={onRejoinQueue}
          className="w-full py-3 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg"
          style={{ background: BRAND_PURPLE }}
        >
          Rejoin Queue
        </button>
      </div>
    </div>
  )
}
