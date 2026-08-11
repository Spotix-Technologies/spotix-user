"use client"

import { AlertTriangle, MessageCircle } from "lucide-react"
import Link from "next/link"
import { INCORRECT_PAYMENT_NOTICE } from "@/utils/paymentMessages"

interface IncorrectAmountStateProps {
  pollId:   string
  pollName: string | null
  message?: string | null
}

export default function IncorrectAmountState({ pollId, pollName, message }: IncorrectAmountStateProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto py-10">
      <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-orange-500" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-3">Incorrect Amount Sent</h2>

      <p className="text-slate-600 leading-relaxed mb-8">
        {message ?? INCORRECT_PAYMENT_NOTICE}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
        <Link
          href={`/polls/${encodeURIComponent(pollName ?? pollId)}`}
          className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
        >
          Back to Poll
        </Link>
      </div>

      <p className="mt-8 text-sm text-slate-400 flex items-center gap-1.5">
        <MessageCircle className="w-4 h-4 flex-shrink-0" />
        Questions about the reversal? Use the chat bubble at the bottom right to reach us
      </p>
    </div>
  )
}
