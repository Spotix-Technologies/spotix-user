"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X, Search, Loader2, ReceiptText, HelpCircle } from "lucide-react"
import { INCORRECT_PAYMENT_NOTICE } from "@/utils/paymentMessages"

interface CheckTicketPaymentModalProps {
  eventName: string
  onClose:   () => void
}

interface PaymentStatusResult {
  reference:        string
  status:            string
  eventId:           string | null
  eventName:         string | null
  ticketType:        string | null
  totalTicketCount:  number | null
  totalAmount:       number | null
  createdAt:         string | null
  message?:          string
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

export function CheckTicketPaymentModal({ eventName, onClose }: CheckTicketPaymentModalProps) {
  const router = useRouter()

  const [reference, setReference] = useState("")
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState("")
  const [result,    setResult]    = useState<PaymentStatusResult | null>(null)

  const handleSearch = async () => {
    const trimmed = reference.trim()
    if (!trimmed) {
      setError("Enter your payment reference to search.")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const res  = await fetch(`/api/v1/event/payment/status?ref=${encodeURIComponent(trimmed)}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "Failed to search payment. Please try again.")
        return
      }

      setResult(json)
    } catch {
      setError("Network error — please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch()
  }

  const handleViewTicket = () => {
    if (result) router.push(`/payment/success?reference=${encodeURIComponent(result.reference)}`)
  }

  const normalized = result?.status.toLowerCase()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <ReceiptText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white leading-tight">Check Payment Status</h3>
                <p className="text-xs text-purple-200 mt-0.5">{eventName}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors mt-0.5 flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="flex items-start gap-2.5 bg-purple-50 border border-purple-200 rounded-xl p-3.5">
            <HelpCircle className="w-4 h-4 text-[#6b2fa5] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Have you paid for a ticket and you're not sure if it reflected? Enter the payment
              reference sent to your email after checkout.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={reference}
              onChange={(e) => { setReference(e.target.value); setError("") }}
              onKeyDown={handleKeyDown}
              placeholder="Payment reference"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#6b2fa5] focus:ring-2 focus:ring-[#6b2fa5]/20 transition-all"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-3 bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center flex-shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {result && (
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{result.eventName ?? eventName}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{result.reference}</p>
                </div>
                {normalized === "successful" || normalized === "success" ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Successful</span>
                ) : normalized === "incorrect_payment" ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">Incorrect Amount</span>
                ) : normalized === "failed" ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">Failed</span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Pending</span>
                )}
              </div>

              {result.totalAmount != null && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {result.totalTicketCount ? `${result.totalTicketCount} ${result.totalTicketCount === 1 ? "ticket" : "tickets"} · ` : ""}
                    ₦{Number(result.totalAmount).toLocaleString()}
                  </span>
                  <span>{formatDate(result.createdAt)}</span>
                </div>
              )}

              {normalized === "incorrect_payment" && (
                <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3 leading-relaxed">
                  {result.message ?? INCORRECT_PAYMENT_NOTICE}
                </p>
              )}

              {(normalized === "successful" || normalized === "success") && (
                <button
                  onClick={handleViewTicket}
                  className="w-full mt-1 py-2 px-4 bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] text-white rounded-lg font-semibold text-xs hover:shadow-lg transition-all"
                >
                  View Ticket
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
