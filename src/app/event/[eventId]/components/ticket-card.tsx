"use client"

import type React from "react"
import { useMemo } from "react"
import { ChevronRight } from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import { buildBarcode } from "../lib/ticket-barcode"

export interface TicketCardProps {
  policy: string
  description?: string
  price: number
  eventName: string
  image: string
  /** Date badge, e.g. { month: "NOV", day: "28" } */
  dateBadge: { month: string; day: string } | null
  /** When set the ticket can't be bought; shown as a pill on the card */
  unavailableLabel: string | null
  onSelect: () => void
}

const STUB = "8rem" // height of the bottom (price) section — the notch sits on its top edge
const NOTCH = 12 // px radius of the half-circle bites

const notchMask = [
  `radial-gradient(circle ${NOTCH}px at 0 calc(100% - ${STUB}), #0000 98%, #000)`,
  `radial-gradient(circle ${NOTCH}px at 100% calc(100% - ${STUB}), #0000 98%, #000)`,
].join(",")

const maskStyle: React.CSSProperties = {
  WebkitMaskImage: notchMask,
  WebkitMaskComposite: "source-in",
  maskImage: notchMask,
  maskComposite: "intersect",
}

/**
 * A ticket-shaped card: poster on top, dashed perforation with side notches
 * (real mask cut-outs, so it works on any background), price + barcode stub below.
 */
export function TicketCard({
  policy,
  description,
  price,
  eventName,
  image,
  dateBadge,
  unavailableLabel,
  onSelect,
}: TicketCardProps) {
  const unavailable = unavailableLabel !== null
  const barcode = useMemo(() => buildBarcode(`${eventName}|${policy}`), [eventName, policy])

  return (
    <div
      className={`drop-shadow-[0_20px_28px_rgba(23,17,35,0.16)] transition-transform duration-300 ${
        unavailable ? "" : "hover:-translate-y-1.5"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={unavailable}
        aria-label={unavailable ? `${policy} — ${unavailableLabel}` : `Select ${policy} ticket`}
        style={maskStyle}
        className={`group relative block w-full overflow-hidden rounded-3xl bg-[#0d0818] text-left text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6b2fa5] disabled:cursor-not-allowed ${
          unavailable ? "grayscale" : ""
        }`}
      >
        {/* Art */}
        <div className="relative h-64 overflow-hidden sm:h-72">
          {image && (
            <img
              src={image}
              alt=""
              decoding="async"
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ${
                unavailable ? "opacity-50" : "group-hover:scale-105"
              }`}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0818] via-[#0d0818]/55 to-[#0d0818]/15" />

          {unavailable && (
            <span className="absolute left-4 top-4 max-w-[60%] rounded-full border border-white/25 bg-black/50 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
              {unavailableLabel}
            </span>
          )}

          {dateBadge && (
            <div className="absolute right-4 top-4 rounded-2xl border border-white/20 bg-white/15 px-3.5 py-2 text-center backdrop-blur-md">
              <p className="text-[10px] font-semibold tracking-[0.22em]">{dateBadge.month}</p>
              <p className="text-2xl font-bold leading-none">{dateBadge.day}</p>
            </div>
          )}

          <div className="absolute inset-x-5 bottom-4">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">{eventName}</p>
            <h3 className="mt-1 text-balance text-3xl font-bold leading-tight tracking-tight">{policy}</h3>
            {description && <p className="mt-1 line-clamp-2 text-sm text-white/60">{description}</p>}
          </div>
        </div>

        {/* Stub */}
        <div className="relative px-5 pb-4 pt-4" style={{ height: STUB }}>
          <div aria-hidden="true" className="absolute inset-x-5 top-0 border-t-2 border-dashed border-white/25" />

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">Price</p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight">{price > 0 ? `₦${formatNumber(price)}` : "Free"}</p>
            </div>
            {!unavailable && (
              <span className="mt-1 grid h-9 w-9 place-items-center rounded-full bg-white text-[#171123] transition-transform group-hover:translate-x-0.5">
                <ChevronRight size={18} aria-hidden="true" />
              </span>
            )}
          </div>

          <svg
            aria-hidden="true"
            viewBox={`0 0 ${barcode.width} 24`}
            preserveAspectRatio="none"
            className="absolute inset-x-5 bottom-4 h-5 w-[calc(100%-2.5rem)] text-white/80"
          >
            {barcode.bars.map((b, i) => (
              <rect key={i} x={b.x} y={0} width={b.w} height={24} fill="currentColor" />
            ))}
          </svg>
        </div>
      </button>
    </div>
  )
}
