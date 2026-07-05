"use client"

import { XCircle, MessageCircle } from "lucide-react"
import Link from "next/link"

interface FailedStateProps {
  pollId:   string
  pollName: string | null
}

export default function FailedState({ pollId, pollName }: FailedStateProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto py-10">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <XCircle className="w-10 h-10 text-red-500" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-3">Payment Failed</h2>

      <p className="text-slate-600 leading-relaxed mb-8">
        Your payment wasn&apos;t successful and you have not been charged at this time. However, if
        you have been charged, send us a message and we will promptly assist you.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
        <Link
          href={`/polls/${encodeURIComponent(pollName ?? pollId)}`}
          className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
        >
          Try Again
        </Link>
      </div>

      <p className="mt-8 text-sm text-slate-400 flex items-center gap-1.5">
        <MessageCircle className="w-4 h-4 flex-shrink-0" />
        Were you charged? Use the chat bubble at the bottom right to reach us
      </p>
    </div>
  )
}
