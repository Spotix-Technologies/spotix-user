"use client"

import dynamic from "next/dynamic"
import { LIGHTS_OUT } from "./effects.constants"
import { useMediaQuery } from "./effects.hooks"

const LightsOut = dynamic(() => import("react-halloween").then((m) => m.LightsOut), { ssr: false })

/**
 * Site goes dark with a spotlight following the cursor.
 * The library says not to use it on touch devices, so it only mounts for a real mouse/trackpad.
 */
export function LightsOutEffect() {
  const hasMouse = useMediaQuery("(hover: hover) and (pointer: fine)")
  if (!hasMouse) return null

  return <LightsOut size={LIGHTS_OUT.size} darkColor={LIGHTS_OUT.darkColor} zIndex={LIGHTS_OUT.zIndex} />
}
