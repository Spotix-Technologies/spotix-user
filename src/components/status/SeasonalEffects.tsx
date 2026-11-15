"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { statusConfig } from "./config"
import { DoomFireEffect } from "./DoomFireEffect"
import { GhostsEffect } from "./GhostsEffect"
import { LightsOutEffect } from "./LightsOutEffect"

// Both libraries touch window/canvas, and neither matters for first paint,
// so they're only loaded in the browser and only when their flag is on.
const Snowfall = dynamic(() => import("react-snowfall"), { ssr: false })
const Eyes = dynamic(() => import("react-halloween").then((m) => m.Eyes), { ssr: false })

/** One quarter of a spider web, anchored at the (0,0) corner of a 200×200 box. */
function buildWebPath(): string {
  const size = 200
  const spokes = 5 // angles 0°, 22.5°, 45°, 67.5°, 90°
  const rings = [40, 80, 120, 160, 200]
  const pt = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180
    return [r * Math.cos(a), r * Math.sin(a)] as const
  }
  const f = (n: number) => n.toFixed(1)

  const parts: string[] = []
  for (let i = 0; i < spokes; i++) {
    const [x, y] = pt(size, (i * 90) / (spokes - 1))
    parts.push(`M0 0L${f(x)} ${f(y)}`)
  }
  for (const r of rings) {
    for (let i = 0; i < spokes - 1; i++) {
      const a0 = (i * 90) / (spokes - 1)
      const a1 = ((i + 1) * 90) / (spokes - 1)
      const [x0, y0] = pt(r, a0)
      const [x1, y1] = pt(r, a1)
      const [cx, cy] = pt(r * 0.72, (a0 + a1) / 2) // pulled toward the corner = the web "sags"
      parts.push(`M${f(x0)} ${f(y0)}Q${f(cx)} ${f(cy)} ${f(x1)} ${f(y1)}`)
    }
  }
  return parts.join("")
}
const WEB_PATH = buildWebPath()

function Cobweb({ side }: { side: "left" | "right" }) {
  return (
    <svg
      className={`hx-web hx-web-${side}`}
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={WEB_PATH} />
    </svg>
  )
}

function Spider() {
  return (
    <div className="hx-spider" aria-hidden="true">
      <span className="hx-thread" />
      <svg aria-hidden="true" viewBox="0 0 40 34" width="30" height="26" fill="#17121f" stroke="#17121f" strokeLinecap="round">
        <g strokeWidth="2" fill="none">
          <path d="M14 15 L5 8 L2 13M14 18 L4 18 L1 24M15 21 L7 29 L4 33M17 23 L13 32" />
          <path d="M26 15 L35 8 L38 13M26 18 L36 18 L39 24M25 21 L33 29 L36 33M23 23 L27 32" />
        </g>
        <ellipse cx="20" cy="19" rx="7" ry="8" stroke="none" />
        <circle cx="20" cy="10" r="4.5" stroke="none" />
        <circle cx="18.3" cy="9.2" r="1.1" fill="#ef4444" stroke="none" />
        <circle cx="21.7" cy="9.2" r="1.1" fill="#ef4444" stroke="none" />
      </svg>
    </div>
  )
}

function Haunting() {
  return (
    <div className="hx-layer" aria-hidden="true">
      <Cobweb side="left" />
      <Cobweb side="right" />
      <Spider />
      <div className="hx-eyes">
        <Eyes
          eyeLayout="menacing"
          width={96}
          eyeBallColor="#f5f0e6"
          irisColor="#f59e0b"
          pupilColor="#000"
          follow
        />
      </div>

      <style>{`
        .hx-layer { position: fixed; inset: 0; z-index: 9990; pointer-events: none; overflow: hidden; }

        .hx-web { position: absolute; top: 0; width: 170px; height: 170px; color: rgba(160, 160, 175, 0.55); filter: drop-shadow(0 0 1px rgba(0,0,0,0.25)); }
        .hx-web-left  { left: 0; }
        .hx-web-right { right: 0; transform: scaleX(-1); }

        .hx-spider { position: absolute; top: 0; left: 118px; display: flex; flex-direction: column; align-items: center; transform-origin: top center; animation: hx-dangle 5.5s ease-in-out infinite; }
        .hx-thread { width: 1px; height: 64px; background: rgba(160, 160, 175, 0.7); }

        .hx-eyes { position: absolute; left: 14px; bottom: 10px; opacity: 0.85; }

        @keyframes hx-dangle {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50%      { transform: translateY(26px) rotate(3deg); }
        }

        @media (max-width: 640px) {
          .hx-web { width: 100px; height: 100px; }
          .hx-spider { left: 70px; }
          .hx-thread { height: 40px; }
          .hx-eyes { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hx-spider { animation: none; }
        }
      `}</style>
    </div>
  )
}

/**
 * Cosmetic page effects, switched by NEXT_PUBLIC_IS_SNOW / _HAUNTED / _DOOMFIRE / _GHOSTS / _LIGHTSOUT.
 * Everything is pointer-events:none so it can never block a click.
 */
export function SeasonalEffects() {
  const { isSnow, isHaunted, isDoomFire, isGhosts, isLightsOut } = statusConfig
  // Respect "reduce motion": no falling snow for people who asked for less movement.
  const [reduceMotion, setReduceMotion] = useState(true)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduceMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  if (!isSnow && !isHaunted && !isDoomFire && !isGhosts && !isLightsOut) return null

  return (
    <>
      {isSnow && !reduceMotion && (
        <div className="sx-snow" aria-hidden="true">
          <Snowfall
            color="#b9cdf5"
            snowflakeCount={70}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
          <style>{`
            .sx-snow {
              position: fixed;
              inset: 0;
              z-index: 9989;
              pointer-events: none;
              contain: strict;
              transform: translateZ(0);
              animation: sx-fade 0.6s ease-out both;
            }
            @keyframes sx-fade { from { opacity: 0; } to { opacity: 1; } }
          `}</style>
        </div>
      )}
      {isHaunted && <Haunting />}
      {isDoomFire && <DoomFireEffect />}
      {isGhosts && <GhostsEffect />}
      {isLightsOut && <LightsOutEffect />}
    </>
  )
}
