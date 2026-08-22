"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Landmark, CreditCard, Smartphone, Hash } from "lucide-react"
import { PAYMENT_METHOD_OPTIONS, type PaymentMethodId } from "@/lib/paystack/payment-channels"
import { isApplePlatform } from "@/lib/paystack/device"

// One consistent brand-purple treatment for every enabled method — Spotix's
// icon language stays purple-on-lavender throughout the checkout (Order
// Summary, Discount, Referral, Wallet, and here), with grey reserved
// specifically to signal "disabled" (Apple Pay, until it's wired up).
const ICON_COLOR = "#6b2fa5"

const METHOD_ICONS: Record<PaymentMethodId, React.ReactNode> = {
  card: <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: ICON_COLOR }} />,
  bank_transfer: <Landmark className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: ICON_COLOR }} />,
  ussd: <Hash className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: ICON_COLOR }} />,
  mobile_money: <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: ICON_COLOR }} />,
  apple_pay: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="text-gray-400">
      <path d="M16.365 1.43c0 1.14-.462 2.25-1.14 3.06-.75.9-1.98 1.59-3.03 1.5a3.36 3.36 0 0 1-.03-.42c0-1.14.51-2.28 1.2-3.03.75-.87 2.04-1.53 3-1.56.03.15.03.3.03.45ZM20.1 17.55c-.36.84-.54 1.2-1.02 1.95-.63 1.02-1.5 2.28-2.61 2.31-.99.03-1.26-.63-2.61-.63s-1.68.6-2.64.63c-1.11.03-1.95-1.14-2.58-2.16-1.77-2.85-1.95-6.21-.87-8.01.78-1.29 2.01-2.04 3.15-2.04 1.17 0 1.9.63 2.85.63.93 0 1.5-.63 2.85-.63 1.02 0 2.1.54 2.88 1.5-2.52 1.38-2.1 4.98.6 6.45Z" />
    </svg>
  ),
}

interface PaymentMethodPickerProps {
  selectedMethod: PaymentMethodId | null
  onSelect: (methodId: PaymentMethodId) => void
  disabled?: boolean
}

/**
 * Lets the buyer pick a specific Paystack channel (card, bank transfer,
 * USSD, mobile money) up front, instead of a single generic "Paystack"
 * button that dumps them into Paystack's own method picker. Mirrors
 * spotix-vote's PaymentMethodPicker, restyled for spotix-user's
 * light/purple checkout theme. Apple Pay is shown greyed out and is not
 * clickable — it's listed so buyers know it's coming, not offered as a
 * working option yet.
 */
export default function PaymentMethodPicker({ selectedMethod, onSelect, disabled }: PaymentMethodPickerProps) {
  const [showApplePay, setShowApplePay] = useState(false)

  // Apple Pay only ever shows on an Apple device — checked client-side
  // only, so it starts hidden and appears after mount (additive, so no
  // SSR mismatch risk).
  useEffect(() => {
    setShowApplePay(isApplePlatform())
  }, [])

  const methods = PAYMENT_METHOD_OPTIONS.filter((m) => m.id !== "apple_pay" || showApplePay)

  return (
    <div className="grid grid-cols-2 gap-3">
      {methods.map((m) => {
        const isDisabled = disabled || !m.available
        return (
          <button
            key={m.id}
            type="button"
            disabled={isDisabled}
            title={!m.available ? `${m.label} — coming soon` : m.description}
            onClick={() => m.available && onSelect(m.id)}
            aria-pressed={selectedMethod === m.id}
            className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border-2 text-left transition-all duration-200 ${
              !m.available
                ? "border-gray-100 bg-gray-50 cursor-not-allowed opacity-60"
                : disabled
                ? "border-gray-200 cursor-not-allowed opacity-50"
                : selectedMethod === m.id
                ? "border-purple-500 bg-purple-50 shadow-md"
                : "border-gray-200 hover:border-purple-300 hover:shadow-sm"
            }`}
          >
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                m.available ? "bg-purple-100" : "bg-gray-200"
              }`}
            >
              {METHOD_ICONS[m.id]}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold text-sm sm:text-base ${m.available ? "text-gray-900" : "text-gray-400"}`}>
                {m.label}
              </h4>
            </div>
            {selectedMethod === m.id && m.available && (
              <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: ICON_COLOR }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
