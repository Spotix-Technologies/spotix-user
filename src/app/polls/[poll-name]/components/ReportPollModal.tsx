"use client"

import { useState } from "react"
import { X, AlertTriangle } from "lucide-react"

interface ReportPollModalProps {
  pollId: string
  pollName: string
  onClose: () => void
}

export function ReportPollModal({ pollId, pollName, onClose }: ReportPollModalProps) {
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = () => {
    if (!description.trim()) {
      setError("Please describe your report before sending.")
      return
    }
    const message = encodeURIComponent(
      `Hello Spotix,\n\nI would like to report the following poll:\n\nPoll ID: ${pollId}\nPoll Name: ${pollName}\n\nReason / Description:\n${description.trim()}\n\nThank you.`
    )
    window.open(`https://wa.me/2348123927685?text=${message}`, "_blank", "noopener,noreferrer")
    onClose()
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1100] flex items-center justify-center p-4"
      style={{ top: "72px" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white leading-tight">Report Poll</h3>
                <p className="text-xs text-purple-200 mt-0.5">Help us keep Spotix safe</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors mt-0.5 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Poll reference */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-0.5 text-xs text-gray-500 font-mono">
            <p>Poll ID: <span className="text-gray-800 font-semibold">{pollId}</span></p>
            <p>Poll Name: <span className="text-gray-800 font-semibold">{pollName}</span></p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Describe the issue <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); setError("") }}
              placeholder="Please describe what's wrong with this poll. Be as specific as possible…"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#6b2fa5] focus:ring-2 focus:ring-[#6b2fa5]/20 resize-none transition-all"
            />
            {error && (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Your report will be sent via WhatsApp to our moderation team. We will review and act within 24–48 hours.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all"
          >
            Send Report →
          </button>
        </div>
      </div>
    </div>
  )
}
