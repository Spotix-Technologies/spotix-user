"use client"

import { useState } from "react"
import { X, Search, Loader2, ReceiptText, CheckCircle2, Clock, XCircle, HelpCircle } from "lucide-react"

interface CheckVotePaymentModalProps {
  pollId:   string
  pollName: string
  onClose:  () => void
}

interface PaymentMatch {
  reference:      string
  status:         string
  contestantName: string
  voteCount:      number
  totalAmount:    number
  pollName:       string
  pollId:         string
  createdAt:      string | null
  payerEmail:     string | null
  payerPhone:     string | null
}

const PAGE_SIZE = 5

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return iso
  }
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  if (normalized === "successful" || normalized === "success") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" /> Successful
      </span>
    )
  }
  if (normalized === "failed") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        <XCircle className="w-3 h-3" /> Failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
      <Clock className="w-3 h-3" /> Pending
    </span>
  )
}

export function CheckVotePaymentModal({ pollId, pollName, onClose }: CheckVotePaymentModalProps) {
  const [query,     setQuery]     = useState("")
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState("")
  const [results,   setResults]   = useState<PaymentMatch[] | null>(null)
  const [visible,   setVisible]   = useState(PAGE_SIZE)

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      setError("Enter an email, phone number, or reference to search.")
      return
    }

    setLoading(true)
    setError("")
    setResults(null)
    setVisible(PAGE_SIZE)

    try {
      const res  = await fetch(
        `/api/v1/vote/check-payment?q=${encodeURIComponent(trimmed)}&pollId=${encodeURIComponent(pollId)}`
      )
      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "Failed to search payments. Please try again.")
        return
      }

      setResults(json.results ?? [])
    } catch {
      setError("Network error — please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch()
  }

  const handleViewReceipt = (reference: string) => {
    window.open(`/polls/${encodeURIComponent(pollId)}/callback?ref=${encodeURIComponent(reference)}`, "_blank", "noopener,noreferrer")
  }

  const visibleResults = results?.slice(0, visible) ?? []
  const hasMore        = !!results && visible < results.length

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1100] flex items-center justify-center p-4" style={{ top: "72px" }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <ReceiptText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white leading-tight">Check Vote Payment</h3>
                <p className="text-xs text-purple-200 mt-0.5">{pollName}</p>
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
              Have you paid to vote on this poll and you&apos;re not sure if it reflected? Enter your email or
              phone number that you used to vote or the reference sent to your email after you voted.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setError("") }}
              onKeyDown={handleKeyDown}
              placeholder="Email, phone number, or reference"
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

          {/* Results */}
          {results !== null && (
            <div className="space-y-3">
              {results.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500">No matching payments found for this poll.</p>
                  <p className="text-xs text-slate-400 mt-1">Double-check what you entered, or try your reference key instead.</p>
                </div>
              ) : (
                <>
                  {visibleResults.map((r) => (
                    <div key={r.reference} className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{r.contestantName}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{r.reference}</p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{Number(r.voteCount).toLocaleString()} {Number(r.voteCount) === 1 ? "vote" : "votes"} · ₦{Number(r.totalAmount).toLocaleString()}</span>
                        <span>{formatDate(r.createdAt)}</span>
                      </div>

                      <button
                        onClick={() => handleViewReceipt(r.reference)}
                        className="w-full mt-1 py-2 px-4 border border-[#6b2fa5] text-[#6b2fa5] rounded-lg font-semibold text-xs hover:bg-[#6b2fa5]/5 transition-colors"
                      >
                        {r.status.toLowerCase() === "pending" ? "Recheck Payment" : "View Receipt"}
                      </button>
                    </div>
                  ))}

                  {hasMore && (
                    <button
                      onClick={() => setVisible((v) => v + PAGE_SIZE)}
                      className="w-full py-2.5 px-4 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
                    >
                      Load More
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
