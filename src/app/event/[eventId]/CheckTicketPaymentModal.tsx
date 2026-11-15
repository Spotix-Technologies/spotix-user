"use client"

import { useState } from "react"
import { X, Search, Loader2, ReceiptText, HelpCircle, Mail } from "lucide-react"
import { DrawerShell } from "./components/drawer-shell"

interface CheckTicketPaymentSheetProps {
  /** Real Firestore event id (not the URL slug) — the backend looks the buyer up in this event's register. */
  eventId:   string
  eventName: string
  onClose:   () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function CheckTicketPaymentSheet({ eventId, eventName, onClose }: CheckTicketPaymentSheetProps) {
  const [query,   setQuery]   = useState("")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  // What was searched, once the request has been accepted. The backend answers
  // identically whether or not a match exists (so this form can't be used to
  // check who bought a ticket) — the message below is deliberately conditional.
  const [submitted, setSubmitted] = useState<{ value: string; isEmail: boolean } | null>(null)

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      setError("Enter your email or payment reference.")
      return
    }
    const isEmail = trimmed.includes("@")
    if (isEmail && !EMAIL_RE.test(trimmed)) {
      setError("Enter a valid email address.")
      return
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
    if (!backendUrl) {
      setError("Something went wrong on our end. Please try again later.")
      return
    }

    setLoading(true)
    setError("")
    setSubmitted(null)

    try {
      const res = await fetch(`${backendUrl}/v1/ticket/resend`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ eventId, query: trimmed }),
      })

      if (res.status === 429) {
        setError("Too many attempts. Please wait a few minutes and try again.")
        return
      }
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setError(json?.message ?? "Failed to send your request. Please try again.")
        return
      }

      setSubmitted({ value: trimmed, isEmail })
    } catch {
      setError("Network error — please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch()
  }

  // Bottom sheet on mobile, side sheet on desktop — see components/drawer-shell.tsx
  return (
    <DrawerShell onClose={onClose} ariaLabel="Find my ticket">
      {(close) => (
        <>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <ReceiptText className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white leading-tight">Find My Ticket</h3>
                <p className="text-xs text-purple-200 mt-0.5">{eventName}</p>
              </div>
            </div>
            <button
              onClick={close}
              aria-label="Close"
              className="text-white/70 hover:text-white transition-colors mt-0.5 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-start gap-2.5 bg-purple-50 border border-purple-200 rounded-xl p-3.5">
            <HelpCircle className="w-4 h-4 text-[#6b2fa5] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Lost your ticket? Enter the email you bought it with, or your payment reference,
              and we&apos;ll email your ticket(s) for this event to the address on them.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setError(""); setSubmitted(null) }}
              onKeyDown={handleKeyDown}
              placeholder="Email or payment reference"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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

          {submitted && (
            <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 rounded-xl p-3.5">
              <Mail className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-xs text-slate-700 leading-relaxed">
                  {submitted.isEmail
                    ? <>If we find <span className="font-semibold break-all">{submitted.value}</span> in this event&apos;s register, we will send them an email with their ticket.</>
                    : <>If we find <span className="font-semibold break-all">{submitted.value}</span> in this event&apos;s register, we will send the buyer an email with their ticket.</>}
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  It can take a minute. Sha check your spam folder too.
                </p>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </DrawerShell>
  )
}
