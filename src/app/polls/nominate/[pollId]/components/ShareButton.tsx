"use client"

import { useState } from "react"
import { Share2, Check, Copy } from "lucide-react"
import { shareOrCopy } from "@/app/lib/share"

interface ShareButtonProps {
  title?: string
  text: string
  url: string
  className?: string
  /** Compact = icon-only, for tight spaces like a nominee row. */
  compact?: boolean
}

export function ShareButton({ title, text, url, className = "", compact = false }: ShareButtonProps) {
  const [feedback, setFeedback] = useState<"copied" | null>(null)

  const handleClick = async () => {
    const method = await shareOrCopy({ title, text, url })
    if (method === "clipboard") {
      setFeedback("copied")
      setTimeout(() => setFeedback(null), 1800)
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleClick}
        title="Share"
        className={`flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-[#6b2fa5] hover:bg-[#6b2fa5]/5 transition-colors flex-shrink-0 ${className}`}
      >
        {feedback === "copied" ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors flex-shrink-0 ${className}`}
    >
      {feedback === "copied" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      {feedback === "copied" ? "Copied" : "Share"}
    </button>
  )
}
