"use client"

import { useState } from "react"
import { Loader2, CheckCircle, AlertCircle, UserPlus } from "lucide-react"

interface NominationFormProps {
  categoryName: string
  alreadyNominated: boolean
  submitting: boolean
  error: string | null
  onSubmit: (name: string) => void
}

export function NominationForm({ categoryName, alreadyNominated, submitting, error, onSubmit }: NominationFormProps) {
  const [name, setName] = useState("")

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (trimmed.length < 2) return
    onSubmit(trimmed)
    setName("")
  }

  if (alreadyNominated) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-700">
          You've already nominated someone in <span className="font-semibold">{categoryName}</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3">
      <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-[#6b2fa5]" />
        Nominate someone for {categoryName}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Enter a name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          maxLength={60}
          className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 text-sm text-black placeholder:text-slate-400 outline-none focus:border-[#6b2fa5] focus:ring-2 focus:ring-[#6b2fa5]/20"
        />
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#6b2fa5] text-white text-sm font-medium hover:bg-[#5a1f8a] disabled:opacity-60 transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Nominate"}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        New name? It starts with 1 nomination. Already listed below? Tap "Nominate" next to them to support it instead. You may nominate just one person.
      </p>
    </div>
  )
}
