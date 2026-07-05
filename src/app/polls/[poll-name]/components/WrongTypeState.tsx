"use client"

import { AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function WrongTypeState() {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto py-10">
      <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-orange-500" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-3">Wrong Transaction Type</h2>

      <p className="text-slate-600 leading-relaxed mb-8">
        This transaction isn&apos;t a voting transaction.
      </p>

      <Link
        href="/vote"
        className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
      >
        Go to Polls
      </Link>
    </div>
  )
}
