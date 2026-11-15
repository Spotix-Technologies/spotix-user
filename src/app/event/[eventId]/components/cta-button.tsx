"use client"

import { ChevronRight, Ticket } from "lucide-react"

interface CtaButtonProps {
  disabled: boolean
  /** Text shown when the button can't be used ("Sold Out", "Sales Ended", …) */
  disabledLabel: string
  isFree: boolean
  isToday: boolean
  onClick: () => void
  onDisabledClick?: () => void
  /** light = white pill (on dark hero) · brand = Spotix purple */
  variant?: "light" | "brand"
  size?: "md" | "lg"
  fullWidth?: boolean
}

/** The one primary "Get tickets / Register" button used by the hero and the mobile bar. */
export function CtaButton({
  disabled,
  disabledLabel,
  isFree,
  isToday,
  onClick,
  onDisabledClick,
  variant = "brand",
  size = "md",
  fullWidth = false,
}: CtaButtonProps) {
  const sizing = size === "lg" ? "px-7 py-4 text-base" : "px-6 py-3 text-base"
  const width = fullWidth ? "w-full" : ""

  if (disabled) {
    return (
      <button
        type="button"
        onClick={onDisabledClick}
        aria-disabled="true"
        className={`${width} ${sizing} cursor-not-allowed rounded-full font-semibold ${
          variant === "brand" ? "bg-gray-200 text-gray-500" : "bg-white/15 text-white/60 backdrop-blur-md"
        }`}
      >
        {disabledLabel}
      </button>
    )
  }

  const palette =
    variant === "light"
      ? "bg-white text-[#171123] hover:bg-purple-50"
      : "bg-[#6b2fa5] text-white hover:bg-[#58248a]"

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${width} ${sizing} ${palette} group inline-flex items-center justify-center gap-2 rounded-full font-semibold shadow-lg shadow-black/10 transition active:scale-[0.98]`}
    >
      <Ticket size={18} aria-hidden="true" />
      {isFree ? "Register Now" : "Get Tickets"}
      {isToday && <span className="text-xs font-medium opacity-70">· Today</span>}
      <ChevronRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}
