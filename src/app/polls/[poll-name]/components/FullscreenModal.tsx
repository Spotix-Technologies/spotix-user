"use client"

import { X } from "lucide-react"
import type { ContestantData } from "@/app/lib/voting-utils"

interface FullscreenModalProps {
  contestant: ContestantData | null
  onClose: () => void
}

export function FullscreenModal({ contestant, onClose }: FullscreenModalProps) {
  if (!contestant) return null
  return (
    <div className="fixed inset-0 z-[1100] bg-black/95 flex items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={contestant.image}
          alt={contestant.name}
          className="max-w-full max-h-full object-contain"
        />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2.5 bg-black/50 hover:bg-black/80 rounded-full text-white transition-colors backdrop-blur-sm"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 px-6 py-5 bg-gradient-to-t from-black/80 to-transparent text-center">
          <h2 className="text-2xl font-bold text-white mb-1">{contestant.name}</h2>
          <p className="text-white/60 font-mono text-xs">{contestant.contestantId}</p>
        </div>
      </div>
    </div>
  )
}
