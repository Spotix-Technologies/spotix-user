"use client"

import { CheckCircle, Vote, Hash, CalendarDays } from "lucide-react"
import Link from "next/link"

interface SuccessStateProps {
  contestantId:   string
  contestantName: string
  voteCount:      number
  updatedAt:      string
  pollId:         string
  pollName:       string | null
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-NG", {
      dateStyle: "long",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}

export default function SuccessState({
  contestantId,
  contestantName,
  voteCount,
  updatedAt,
  pollId,
  pollName,
}: SuccessStateProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto py-10">
      {/* Success icon */}
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10 text-green-500" />
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-1">Votes Confirmed!</h2>
      <p className="text-slate-500 mb-8 text-sm">Your payment was received and your votes have been counted.</p>

      {/* Detail cards */}
      <div className="w-full space-y-3 mb-8">
        <div className="flex items-center gap-3 px-4 py-3.5 bg-[#6b2fa5]/5 border border-[#6b2fa5]/20 rounded-xl text-left">
          <Vote className="w-5 h-5 text-[#6b2fa5] flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-400 font-medium">Voted For</p>
            <p className="text-sm font-semibold text-slate-900">{contestantName}</p>
            <p className="text-xs text-slate-400 font-mono">{contestantId}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5 bg-[#6b2fa5]/5 border border-[#6b2fa5]/20 rounded-xl text-left">
          <Hash className="w-5 h-5 text-[#6b2fa5] flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-400 font-medium">Number of Votes</p>
            <p className="text-sm font-semibold text-slate-900">
              {Number(voteCount).toLocaleString()} {Number(voteCount) === 1 ? "vote" : "votes"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-3.5 bg-[#6b2fa5]/5 border border-[#6b2fa5]/20 rounded-xl text-left">
          <CalendarDays className="w-5 h-5 text-[#6b2fa5] flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-400 font-medium">Payment Date &amp; Time</p>
            <p className="text-sm font-semibold text-slate-900">{formatDateTime(updatedAt)}</p>
          </div>
        </div>
      </div>

      <Link
        href={`/polls/${encodeURIComponent(pollName ?? pollId)}`}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] text-white rounded-xl font-semibold transition-all hover:shadow-lg"
      >
        Back to Poll
      </Link>
    </div>
  )
}
