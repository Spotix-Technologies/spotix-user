"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getLenis } from "./useLenis"

/**
 * CTA — Lenis scroll-driven stanza reveal.
 *
 * Section is 500vh tall. A sticky 100vh viewport shows one stanza at a time.
 *
 * Stanzas:
 *   [0] "so we built"          0%  → 18%
 *   [1] "event ticketing"     18%  → 38%
 *   [2] "Enter Spotix"        38%  → 72%   zooms in → flies into the "P"
 *   [3] Card + tagline        72%  → 100%  revealed behind the portal
 */

export default function CTA() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stanzaRefs = useRef<(HTMLDivElement | null)[]>([])
  const ctaRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  // The "Enter Spotix" text element — we'll scale this
  const spotixTextRef = useRef<HTMLSpanElement>(null)
  // Clip mask that reveals the card through the "P"
  const portalMaskRef = useRef<HTMLDivElement>(null)
  // Card backdrop that lives "inside" the portal
  const cardStageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let attempt = 0
    let cleanup: (() => void) | null = null

    function attach() {
      const lenis = getLenis()
      if (!lenis) {
        if (attempt++ < 40) setTimeout(attach, 100)
        return
      }

      /**
       * Slices: [start, end] as fractions of total scroll progress (0–1)
       * We extended the section to 500vh so the zoom has breathing room.
       */
      const slices: [number, number][] = [
        [0.00, 0.18],  // "so we built"
        [0.18, 0.38],  // "event ticketing"
        [0.38, 0.72],  // "Enter Spotix" — zoom slice
        [0.72, 1.00],  // Card + tagline
      ]

      function easeInOutCubic(t: number) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      }
      function easeOutExpo(t: number) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      }

      function onScroll() {
        const wrapper = wrapperRef.current
        if (!wrapper) return

        const wRect = wrapper.getBoundingClientRect()
        const totalScroll = wrapper.offsetHeight - window.innerHeight
        const progress = Math.min(1, Math.max(0, -wRect.top / totalScroll))

        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${progress})`
        }

        // ── Stanzas 0, 1: standard reveal/exit ──
        ;[0, 1].forEach((i) => {
          const el = stanzaRefs.current[i]
          if (!el) return
          const [start, end] = slices[i]
          const local = Math.min(1, Math.max(0, (progress - start) / (end - start)))
          const revealT = Math.min(1, local / 0.35)
          const exitT = Math.max(0, (local - 0.7) / 0.3)
          const ty = (1 - revealT) * 64 - exitT * 44
          const opacity = Math.max(0, Math.min(1, revealT - exitT * 1.5))
          const scale = 0.93 + revealT * 0.07 - exitT * 0.04
          el.style.transform = `translateY(${ty}px) scale(${scale})`
          el.style.opacity = String(opacity)
        })

        // ── Stanza 2: "Enter Spotix" zoom-into-P ──
        const [s2start, s2end] = slices[2]
        const s2local = Math.min(1, Math.max(0, (progress - s2start) / (s2end - s2start)))
        const s2el = stanzaRefs.current[2]

        if (s2el) {
          // Phase 1 (0→0.25): text fades in from below, normal size
          const revealT = Math.min(1, s2local / 0.25)
          // Phase 2 (0.35→1.0): zoom. Scale goes from 1 → ~16 (fills + blows past viewport)
          const zoomRaw = Math.max(0, (s2local - 0.35) / 0.65)
          const zoomT = easeInOutCubic(zoomRaw)
          const zoomScale = 1 + zoomT * 15  // 1x → 16x

          // Fade the overall stanza container out as zoom peaks (text dissolves into whiteness)
          const fadeOut = zoomRaw > 0.6 ? Math.min(1, (zoomRaw - 0.6) / 0.4) : 0
          const opacity = Math.max(0, Math.min(1, revealT) - fadeOut)

          // translateY: slight float-in on reveal, then pull toward center as we zoom
          const ty = (1 - Math.min(1, revealT)) * 60

          s2el.style.transform = `translateY(${ty}px) scale(${zoomScale})`
          s2el.style.opacity = String(opacity)
        }

        // ── Portal mask: the "P" hole that reveals the card behind ──
        // Starts invisible, expands as the zoom peaks, then fills screen
        if (portalMaskRef.current) {
          const zoomRaw = Math.max(0, (s2local - 0.35) / 0.65)
          // Portal clip-path circle grows from 0% to 100% (covers full viewport)
          const portalT = easeOutExpo(Math.min(1, zoomRaw / 0.8))
          // Position the portal at the center of the "P" letter
          // "Enter Spotix" — "S" starts around 56% left, "P" is at ~63%
          // We'll center it in the viewport horizontally (it reads more naturally)
          const size = Math.round(portalT * 200)  // 0% → 200% (overshoots corners)
          portalMaskRef.current.style.clipPath =
            `circle(${size}% at 50% 50%)`
          portalMaskRef.current.style.opacity = zoomRaw > 0.05 ? "1" : "0"
        }

        // ── Stanza 3: card + tagline ──
        const [s3start, s3end] = slices[3]
        const s3local = Math.min(1, Math.max(0, (progress - s3start) / (s3end - s3start)))
        const s3el = stanzaRefs.current[3]

        if (s3el) {
          const revealT = easeOutExpo(Math.min(1, s3local / 0.4))
          const ty = (1 - revealT) * 40
          s3el.style.transform = `translateY(${ty}px)`
          s3el.style.opacity = String(revealT)
        }

        // CTA card: slightly delayed within stanza 3
        if (ctaRef.current) {
          const cardT = easeOutExpo(Math.min(1, Math.max(0, (s3local - 0.15) / 0.5)))
          ctaRef.current.style.transform = `translateY(${(1 - cardT) * 56}px)`
          ctaRef.current.style.opacity = String(cardT)
        }
      }

      lenis.on("scroll", onScroll)
      onScroll()
      cleanup = () => lenis.off("scroll", onScroll)
    }

    attach()
    return () => { cleanup?.() }
  }, [])

  const stanzaBase: React.CSSProperties = {
    opacity: 0,
    transform: "translateY(64px)",
    willChange: "transform, opacity",
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 1.5rem",
    pointerEvents: "none",
  }

  return (
    // 500vh — extra height gives the zoom effect enough scroll distance to feel cinematic
    <div ref={wrapperRef} style={{ height: "500vh" }} className="relative">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-gray-950 flex flex-col items-center justify-center">

        {/* ── Ambient background ── */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,rgba(107,47,165,0.15)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-900/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-900/15 rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* ── Progress bar ── */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/5 z-30">
          <div
            ref={progressRef}
            className="h-full bg-gradient-to-r from-[#6b2fa5] to-pink-500 origin-left"
            style={{ transform: "scaleX(0)" }}
          />
        </div>

        {/* ── Corner labels ── */}
        <div className="absolute top-10 left-8 sm:top-12 sm:left-12 z-20 pointer-events-none">
          <p className="text-white/35 text-xs sm:text-sm font-medium leading-relaxed tracking-wide">
            Ready to Make<br />
            <span className="text-white/60 font-bold text-sm sm:text-base">Events Pop.</span>
          </p>
        </div>
        <div className="absolute bottom-10 right-8 sm:bottom-12 sm:right-12 z-20 text-right pointer-events-none">
          <p className="text-white/35 text-xs sm:text-sm font-medium leading-relaxed tracking-wide italic">
            Cos, your event<br />
            <span className="text-white/60 font-bold not-italic">needs to be grand.</span>
          </p>
        </div>

        {/* ══════════════════════════════════════
            PORTAL LAYER — revealed through the "P"
            Lives behind the text, in front of the dark background.
            clip-path circle expands from center as zoom progresses.
        ══════════════════════════════════════ */}
        <div
          ref={portalMaskRef}
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            opacity: 0,
            clipPath: "circle(0% at 50% 50%)",
            willChange: "clip-path, opacity",
            // The portal interior: rich purple-black atmosphere
            background: "radial-gradient(ellipse 70% 70% at 50% 50%, #1a0a2e 0%, #0d0015 60%, #050008 100%)",
          }}
        >
          {/* Inner glow of the portal */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(107,47,165,0.35)_0%,transparent_70%)]" />
          {/* Particle-like shimmer rings */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[30vw] h-[30vw] rounded-full border border-purple-500/10 animate-[spin_12s_linear_infinite]" />
            <div className="absolute w-[50vw] h-[50vw] rounded-full border border-purple-500/[0.06] animate-[spin_20s_linear_infinite_reverse]" />
            <div className="absolute w-[70vw] h-[70vw] rounded-full border border-pink-500/[0.04] animate-[spin_30s_linear_infinite]" />
          </div>
        </div>

        {/* ══════════════════════════════════════
            STANZA STAGE — all text layers stack here (z-20, above portal)
        ══════════════════════════════════════ */}
        <div className="relative z-20 w-full" style={{ height: "100vh" }}>

          {/* Stanza 0 — "so we built" */}
          <div ref={(el) => { stanzaRefs.current[0] = el }} style={stanzaBase}>
            <p
              className="text-white/45 font-light uppercase tracking-[0.18em] text-center"
              style={{ fontSize: "clamp(1.1rem, 3vw, 1.75rem)" }}
            >
              so we built
            </p>
          </div>

          {/* Stanza 1 — "event ticketing" */}
          <div ref={(el) => { stanzaRefs.current[1] = el }} style={stanzaBase}>
            <h2
              className="font-black leading-none text-center"
              style={{
                fontSize: "clamp(2.8rem, 9vw, 8rem)",
                color: "rgba(255,255,255,0.88)",
                letterSpacing: "-0.04em",
              }}
            >
              event ticketing
            </h2>
          </div>

          {/* Stanza 2 — "Enter Spotix" (the zoom) */}
          <div
            ref={(el) => { stanzaRefs.current[2] = el }}
            style={{
              ...stanzaBase,
              // transform-origin: center of the "P" in "Spotix"
              // "Spotix" starts at roughly 52% of the string width from left.
              // "P" is the 2nd char of Spotix → ~57% into total string.
              // We bias the origin slightly right of center to hit the P.
              transformOrigin: "57% 50%",
            }}
          >
            <span
              ref={spotixTextRef}
              className="block font-black leading-none select-none text-center"
              style={{
                fontSize: "clamp(3.2rem, 13vw, 11rem)",
                background: "linear-gradient(135deg, #ffffff 0%, #a855f7 35%, #ec4899 65%, #ffffff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.05em",
              }}
            >
              Enter Spotix
            </span>
          </div>

          {/* Stanza 3 — tagline + CTA card (appears after portal opens) */}
          <div
            ref={(el) => { stanzaRefs.current[3] = el }}
            style={{ ...stanzaBase, gap: "1.5rem", pointerEvents: "auto" }}
          >
            <p
              className="font-light text-white/55 tracking-widest uppercase text-center"
              style={{ fontSize: "clamp(0.85rem, 2.5vw, 1.3rem)", letterSpacing: "0.28em" }}
            >
              As it should be.
            </p>

            <div
              ref={ctaRef}
              className="w-full max-w-sm"
              style={{ opacity: 0, transform: "translateY(56px)", willChange: "transform, opacity" }}
            >
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 sm:p-9 shadow-2xl">
                <div className="absolute -inset-px bg-gradient-to-br from-[#6b2fa5]/30 via-transparent to-pink-500/15 rounded-3xl blur-sm pointer-events-none" />
                <div className="relative">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-bold uppercase tracking-widest mb-5">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
                    Start Today
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
                    Your events deserve{" "}
                    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      the spotlight.
                    </span>
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed mb-7">
                    Join organisers and attendees already using Spotix to make events unforgettable.
                  </p>
                  <Link
                    href="/home"
                    className="group w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#6b2fa5] to-purple-600 text-white rounded-2xl font-bold text-base transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/40 relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Explore Events
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                  <div className="mt-5 flex items-center justify-center gap-2 text-gray-500 text-xs">
                    <span>✓ Free to join</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                    <span>✓ No hidden fees</span>
                    <span className="w-1 h-1 bg-gray-600 rounded-full" />
                    <span>✓ Instant access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll nudge — only visible before zoom begins */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 text-white/20 text-xs tracking-widest uppercase pointer-events-none">
          <span>scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/15 to-transparent" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none z-40" />
      </div>
    </div>
  )
}