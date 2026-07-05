"use client"

import { RefreshCw, MessageCircle } from "lucide-react"

interface PendingStateProps {
  onRefresh: () => void
  refreshing: boolean
}

export default function PendingState({ onRefresh, refreshing }: PendingStateProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto py-10">
      {/* Animated clock icon */}
      <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mb-6">
        <svg
          className="w-10 h-10 text-yellow-500 animate-pulse"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
          <polyline points="12 6 12 12 16 14" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-3">Payment Pending</h2>

      <p className="text-slate-600 leading-relaxed mb-8">
        Spotix is yet to reconcile your payment. If you have paid already, kindly refresh this page.
        If you&apos;ve refreshed a couple of times and the status is still pending, kindly send us
        a message by clicking the bubble at the bottom right of the screen and we will promptly
        assist you.
      </p>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-semibold transition-all disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        {refreshing ? "Checking…" : "Refresh Status"}
      </button>

      <p className="mt-6 text-sm text-slate-400 flex items-center gap-1.5">
        <MessageCircle className="w-4 h-4" />
        Need help? Use the chat bubble at the bottom right
      </p>
    </div>
  )
}
