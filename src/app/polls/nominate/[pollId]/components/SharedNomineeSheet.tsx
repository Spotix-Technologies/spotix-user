"use client"

import { useEffect, useState } from "react"
import { X, Loader2, UserPlus, Check } from "lucide-react"
import { dicebearAvatarUrl } from "@/app/lib/dicebear"

interface SharedNominee {
  nomineeId: string
  name: string
  count: number
}

interface SharedNomineeSheetProps {
  nominee: SharedNominee
  categoryName: string
  submitting: boolean
  alreadyNominated: boolean
  onNominate: () => void
  onClose: () => void
}

export function SharedNomineeSheet({
  nominee, categoryName, submitting, alreadyNominated, onNominate, onClose,
}: SharedNomineeSheetProps) {
  // Mounts translated fully off-screen, then animates up on the next frame —
  // gives the slide-from-bottom effect instead of popping in.
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const handleClose = () => {
    setOpen(false)
    setTimeout(onClose, 250) // let the slide-down finish before unmounting
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />
      <div
        className={`relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-5 sm:p-6 pb-8 transition-transform duration-300 ease-out
          ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
        <button onClick={handleClose} className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>

        <p className="text-xs font-semibold text-[#6b2fa5] uppercase tracking-wide mb-3">You were invited to nominate</p>

        <div className="flex items-center gap-4 mb-5">
          <img src={dicebearAvatarUrl(nominee.name)} alt={nominee.name} className="w-16 h-16 rounded-full bg-slate-100 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-lg font-bold text-slate-900 capitalize truncate">{nominee.name}</p>
            <p className="text-sm text-slate-500">
              for {categoryName} · {nominee.count} nomination{nominee.count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {alreadyNominated ? (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700">You've already nominated someone in this category.</p>
          </div>
        ) : (
          <button
            onClick={onNominate}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#6b2fa5] text-white font-semibold hover:bg-[#5a1f8a] disabled:opacity-60 transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Nominate {nominee.name}
          </button>
        )}
      </div>
    </div>
  )
}
