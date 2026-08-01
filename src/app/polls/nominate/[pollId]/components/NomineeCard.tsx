"use client"

import { Loader2, UserPlus, Check, Trophy } from "lucide-react"
import { dicebearAvatarUrl } from "@/app/lib/dicebear"
import { ShareButton } from "./ShareButton"
import { buildNominationShareUrl, buildNominationShareMessage } from "@/app/lib/share"

interface NomineeCardProps {
  nomineeId: string
  name: string
  count: number
  pollId: string
  categoryId: string
  categoryName: string
  onNominate: () => void
  submitting: boolean
  disabled: boolean
  /** True once this nominee's count has reached the poll's Nomination
   *  Threshold — they've qualified for the real vote and can't receive
   *  any more nominations. Takes priority over `disabled` in the UI. */
  maxed: boolean
}

export function NomineeCard({
  nomineeId, name, count, pollId, categoryId, categoryName, onNominate, submitting, disabled, maxed,
}: NomineeCardProps) {
  const shareUrl = buildNominationShareUrl(pollId, categoryId, nomineeId)
  const shareText = buildNominationShareMessage(name, categoryName)

  return (
    <div className={`flex items-center gap-3 bg-white rounded-xl border p-3 ${maxed ? "border-amber-200" : "border-slate-200"}`}>
      <img
        src={dicebearAvatarUrl(name)}
        alt={name}
        className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 truncate capitalize">{name}</p>
        <p className="text-xs text-slate-500">
          {count} nomination{count !== 1 ? "s" : ""}
        </p>
      </div>

      {!maxed && <ShareButton compact title="Nominate a candidate" text={shareText} url={shareUrl} />}

      <button
        onClick={onNominate}
        disabled={disabled || maxed || submitting}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors
          ${maxed
            ? "bg-amber-50 text-amber-700 cursor-not-allowed"
            : disabled
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-[#6b2fa5]/10 text-[#6b2fa5] hover:bg-[#6b2fa5] hover:text-white"}`}
      >
        {submitting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : maxed ? (
          <>
            <Trophy className="w-3.5 h-3.5" />
            Max Nomination
          </>
        ) : disabled ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <>
            <UserPlus className="w-3.5 h-3.5" />
            Nominate
          </>
        )}
      </button>
    </div>
  )
}
