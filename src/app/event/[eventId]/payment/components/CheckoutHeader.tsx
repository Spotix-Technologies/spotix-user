"use client"

import { ArrowLeft, Check, ShieldCheck } from "lucide-react"
import { BRAND_PURPLE } from "../constants"

interface CheckoutHeaderProps {
  isFreeEvent: boolean
  onBack: () => void
}

export default function CheckoutHeader({ isFreeEvent, onBack }: CheckoutHeaderProps) {
  return (
    <div className="mb-5 sm:mb-8 lg:mb-10">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-purple-700 transition-colors mb-4 -ml-1 px-1 py-1.5 rounded-lg"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Back to Event</span>
      </button>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: BRAND_PURPLE }}
        >
          <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
            {isFreeEvent ? "Complete Registration" : "Secure Checkout"}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600">
            {isFreeEvent ? "Register for this free event" : "Choose your preferred payment method"}
          </p>
        </div>
      </div>

      {/* Where the buyer is in the flow (purely visual) */}
      <ol className="mt-5 flex items-center gap-2 text-xs sm:text-sm font-semibold" aria-label="Checkout progress">
        <li className="flex items-center gap-1.5 text-purple-700">
          <span className="w-5 h-5 rounded-full bg-purple-600 text-white grid place-items-center">
            <Check size={12} />
          </span>
          Tickets
        </li>
        <li aria-hidden="true" className="h-px w-5 sm:w-8 bg-purple-300" />
        <li className="flex items-center gap-1.5 text-gray-900" aria-current="step">
          <span className="w-5 h-5 rounded-full border-2 border-purple-600 text-purple-700 grid place-items-center text-[10px]">2</span>
          {isFreeEvent ? "Register" : "Payment"}
        </li>
        <li aria-hidden="true" className="h-px w-5 sm:w-8 bg-gray-300" />
        <li className="flex items-center gap-1.5 text-gray-400">
          <span className="w-5 h-5 rounded-full border-2 border-gray-300 grid place-items-center text-[10px]">3</span>
          Get tickets
        </li>
      </ol>
    </div>
  )
}
