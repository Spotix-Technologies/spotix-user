import { formatNumber } from "@/utils/formatter"
import type { ReactNode } from "react"

/** Sticky bottom bar on small screens: starting price on the left, primary CTA on the right. */
export function MobileCtaBar({ startingPrice, cta }: { startingPrice: number | null; cta: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200/70 bg-white/80 p-3 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-4xl items-center gap-4">
        {startingPrice !== null && (
          <div className="shrink-0 leading-tight">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
              {startingPrice === 0 ? "Entry" : "From"}
            </p>
            <p className="text-lg font-bold text-[#171123]">{startingPrice === 0 ? "Free" : `₦${formatNumber(startingPrice)}`}</p>
          </div>
        )}
        <div className="min-w-0 flex-1">{cta}</div>
      </div>
    </div>
  )
}
