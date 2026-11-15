"use client"

// app/event/[eventId]/components/location-permission-popup.tsx
//
// Bottom-corner popup asking the visitor to share their precise
// location. Purely additive — declining it doesn't break anything, it
// just means Numerox falls back to the coarser edge/IP-resolved state
// (see useEventLocationSignal.ts). Shown at most once per browser.

import { MapPin, X } from "lucide-react"

interface LocationPermissionPopupProps {
  onAllow: () => void
  onDismiss: () => void
}

export function LocationPermissionPopup({ onAllow, onDismiss }: LocationPermissionPopupProps) {
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[60]">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-4 flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#6b2fa5]/10 flex items-center justify-center shrink-0">
          <MapPin className="w-5 h-5 text-[#6b2fa5]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">Share your location?</p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Helps the organizer see where their audience is coming from, and helps us show you more relevant
            events nearby.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={onAllow}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#6b2fa5] text-white hover:bg-[#5a2589] transition-colors"
            >
              Allow location
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-slate-300 hover:text-slate-500 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
