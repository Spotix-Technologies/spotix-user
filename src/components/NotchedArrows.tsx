"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"

interface NotchedArrowsProps {
  onPrev: () => void
  onNext: () => void
  disabled?: boolean
  prevLabel?: string
  nextLabel?: string
}

const FLARE = 20 // px — radius of the concave curve where the tab meets the edge

/**
 * Two round arrows sitting in a white "notch" cut into the bottom-centre of
 * an image. The tab is flush with the bottom edge, so the surface below the
 * image must be white for the notch to read as a cut-out.
 *
 * The parent must be `relative` + `overflow-hidden`.
 */
export function NotchedArrows({
  onPrev,
  onNext,
  disabled = false,
  prevLabel = "Previous",
  nextLabel = "Next",
}: NotchedArrowsProps) {
  const btn =
    "grid h-9 w-9 place-items-center rounded-full border border-gray-200 bg-white text-gray-800 " +
    "transition hover:border-gray-300 hover:bg-gray-50 active:scale-95 disabled:opacity-40 " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6b2fa5]"

  return (
    <div className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2">
      <div className="relative flex items-center gap-3 rounded-t-[28px] bg-white px-5 pt-2.5 pb-2.5">
        {/* concave flares that blend the tab into the bottom edge */}
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-full"
          style={{
            width: FLARE,
            height: FLARE,
            background: `radial-gradient(circle at 0 0, transparent ${FLARE}px, #fff ${FLARE + 0.5}px)`,
          }}
        />
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-full"
          style={{
            width: FLARE,
            height: FLARE,
            background: `radial-gradient(circle at 100% 0, transparent ${FLARE}px, #fff ${FLARE + 0.5}px)`,
          }}
        />
        <button type="button" onClick={onPrev} disabled={disabled} aria-label={prevLabel} className={btn}>
          <ArrowLeft size={16} strokeWidth={2.25} />
        </button>
        <button type="button" onClick={onNext} disabled={disabled} aria-label={nextLabel} className={btn}>
          <ArrowRight size={16} strokeWidth={2.25} />
        </button>
      </div>
    </div>
  )
}

export default NotchedArrows
