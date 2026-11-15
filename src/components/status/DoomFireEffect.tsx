"use client"

import dynamic from "next/dynamic"
import { DOOM_FIRE } from "./effects.constants"
import { useMediaQuery, useViewportWidth } from "./effects.hooks"

// Canvas-based, so browser-only. Chunk is only fetched when the flag is on.
const DoomFire = dynamic(() => import("react-halloween").then((m) => m.DoomFire), { ssr: false })

/** A strip of pixel fire along the bottom edge of the screen. Never blocks clicks. */
export function DoomFireEffect() {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const width = useViewportWidth()

  if (reduceMotion || width === 0) return null

  const isMobile = width <= DOOM_FIRE.mobileBreakpoint
  const height = isMobile ? DOOM_FIRE.heightMobile : DOOM_FIRE.height

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        height,
        zIndex: DOOM_FIRE.zIndex,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: 0.85,
        // Let the flames fade out toward the top instead of ending in a hard edge.
        maskImage: "linear-gradient(to top, #000 55%, transparent)",
        WebkitMaskImage: "linear-gradient(to top, #000 55%, transparent)",
        contain: "strict",
      }}
    >
      <DoomFire
        width={width}
        height={height}
        pixelSize={isMobile ? DOOM_FIRE.pixelSizeMobile : DOOM_FIRE.pixelSize}
        fireStrength={DOOM_FIRE.fireStrength}
      />
    </div>
  )
}
