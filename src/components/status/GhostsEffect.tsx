"use client"

import type { CSSProperties, ReactNode } from "react"
import dynamic from "next/dynamic"
import { GHOSTS } from "./effects.constants"
import { useMediaQuery } from "./effects.hooks"

const Haunted = dynamic(() => import("react-halloween").then((m) => m.Haunted), { ssr: false })

function GhostIcon() {
  return (
    <svg viewBox="0 0 24 24" width={28} height={28} aria-hidden="true" fill="#f5f0e6">
      <path d="M12 2C7.6 2 4 5.6 4 10v11l2.7-2.2L9 21l3-2.4L15 21l2.3-2.2L20 21V10c0-4.4-3.6-8-8-8z" />
      <circle cx="9.2" cy="10" r="1.4" fill="#17121f" />
      <circle cx="14.8" cy="10" r="1.4" fill="#17121f" />
    </svg>
  )
}

/**
 * `<Haunted>` with a glassy ghost orb inside — hover it and ghosts fly out + it glows.
 * Wrap anything with this if you'd rather haunt a specific element than the corner orb.
 */
export function HauntedBox({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  return (
    <Haunted
      disableFun={reduceMotion}
      creatureOptions={GHOSTS.creatureOptions}
      glowOptions={GHOSTS.glowOptions}
      style={style}
    >
      {children}
    </Haunted>
  )
}

/** Floating ghost orb pinned to the bottom-left. Only the orb itself takes pointer events. */
export function GhostsEffect() {
  return (
    <div
      style={{
        position: "fixed",
        left: GHOSTS.left,
        bottom: GHOSTS.bottom,
        zIndex: GHOSTS.zIndex,
      }}
    >
      <HauntedBox
        style={{
          width: GHOSTS.size,
          height: GHOSTS.size,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          background: "rgba(23, 18, 31, 0.45)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <GhostIcon />
      </HauntedBox>
    </div>
  )
}
