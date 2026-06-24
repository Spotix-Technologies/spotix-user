"use client"

import { Camera, Download } from "lucide-react"

interface SaveTicketsBannerProps {
  isMultiTicket: boolean
  isGuest: boolean
  email: string
  onDownload: () => void
  downloading: boolean
  downloaded: boolean
}

export default function SaveTicketsBanner({
  isMultiTicket,
  isGuest,
  email,
  onDownload,
  downloading,
  downloaded,
}: SaveTicketsBannerProps) {
  const ticketWord = isMultiTicket ? "tickets" : "ticket"

  return (
    <div className="rounded-2xl overflow-hidden shadow-md mb-6">
      {/* Screenshot nudge */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 px-6 py-4 flex items-start gap-3">
        <Camera className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">
            📸 Screenshot or download your {ticketWord} now!
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Save your QR code{isMultiTicket ? "s" : ""} — you&apos;ll need{" "}
            {isMultiTicket ? "them" : "it"} for entry at the event.
          </p>
        </div>
      </div>

      {/* Download button */}
      <div className="bg-white border-x border-b border-amber-200 px-6 py-4 flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onDownload}
          disabled={downloading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-bold rounded-xl transition-colors shadow"
        >
          <Download size={17} />
          {downloading
            ? "Preparing PDF…"
            : downloaded
            ? "Download Again"
            : `Download ${isMultiTicket ? "All Tickets" : "Ticket"} as PDF`}
        </button>
        {downloaded && (
          <p className="text-xs text-green-600 font-semibold">
            ✓ PDF saved — check your downloads!
          </p>
        )}
      </div>

      {/* Guest account nudge — only shown for guest purchases */}
      {isGuest && (
        <div className="bg-purple-50 border-x border-b border-purple-200 px-6 py-4 flex items-start gap-3">
          <span className="text-lg">💡</span>
          <p className="text-sm text-purple-800">
            <span className="font-bold">Want to access your {ticketWord} anytime?</span>{" "}
            Create a free Spotix account with{" "}
            <span className="font-mono font-bold">{email}</span> and all your tickets will
            be waiting for you in your ticket history.
          </p>
        </div>
      )}
    </div>
  )
}
