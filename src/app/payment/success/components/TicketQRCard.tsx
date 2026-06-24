"use client"

import QRCode from "react-qr-code"

interface TicketQRCardProps {
  ticketId: string
  index: number
  total: number
  qrRef: (el: HTMLDivElement | null) => void
}

export default function TicketQRCard({ ticketId, index, total, qrRef }: TicketQRCardProps) {
  return (
    <div className="flex flex-col items-center bg-white border-2 border-purple-100 rounded-2xl p-5 shadow-sm">
      {total > 1 && (
        <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">
          Ticket {index + 1} of {total}
        </p>
      )}

      {/* QR code — visible to the user */}
      <div
        ref={qrRef}
        className="p-3 bg-white rounded-xl border border-purple-100 shadow-inner"
      >
        <QRCode
          value={ticketId}
          size={180}
          level="H"
          fgColor="#6b2fa5"
          bgColor="#ffffff"
        />
      </div>

      {/* Ticket ID under QR */}
      <p className="mt-3 text-xs font-mono font-bold text-gray-700 tracking-wider text-center break-all">
        {ticketId}
      </p>
    </div>
  )
}
