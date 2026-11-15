"use client"

/**
 * ScrollWords — "On Spotix you can …" scroll-scrubbed word reel.
 *
 * Adapted from the sticky word-hero pattern, rebuilt so it is safe inside this site:
 *  - every style is scoped to this section (the original injected global `header`, `ul`,
 *    `li`, `main`, `footer` and `body::before` rules that would restyle the whole app);
 *  - it is driven by one scroll-progress value instead of CSS view-timelines and
 *    `background-attachment: fixed` text clipping, which don't work on iOS Safari and
 *    aren't in every browser — so it behaves identically everywhere;
 *  - colours come from the landing design tokens (theme.ts), not a hue slider.
 *
 * How it works: the section is several screens tall and a full-height stage sticks to the
 * viewport. Scroll position (measured in "vh units" of scrolled distance) is mapped onto
 * three phases:
 *
 *   LEAD   – the first word is already highlighted while the section settles in
 *   WORDS  – the reel moves one word per STEP, pausing (dwelling) on each word
 *   REVEAL – a dark panel rises over the reel: "All and more is right here on Spotix"
 *   HOLD   – the finished panel rests before the next section scrolls in
 *
 * Progress is lerped in a rAF loop and written straight to the DOM (no React state per frame),
 * on top of Lenis' own smoothing, so motion stays smooth on wheel, trackpad and touch.
 * Users with `prefers-reduced-motion` get a static layout instead.
 */

import { useEffect, useRef, useState } from "react"
import type { Ref } from "react"
import { CalendarPlus, Ticket, Sparkles, BarChart3, Megaphone, ScanLine } from "lucide-react"
import { BRAND, UI } from "./theme"

/* ─── Content ─────────────────────────────────────────────────────────────── */

const ITEMS = [
  {
    word: "create events.",
    caption: "Launch a polished event page in minutes.",
    icon: CalendarPlus,
  },
  {
    word: "sell tickets.",
    caption: "Free or paid we help you sell all.",
    icon: Ticket,
  },
  {
    word: "build memories.",
    caption: "Give your crowd a night they'll talk about long after.",
    icon: Sparkles,
  },
  {
    word: "monitor stats.",
    caption: "Watch sales and attendance update live from your dashboard.",
    icon: BarChart3,
  },
  {
    word: "run email & SMS campaigns.",
    caption: "Reach your audience directly and fill the room.",
    icon: Megaphone,
  },
  {
    word: "scan tickets offline.",
    caption: "Gate entry that works even when the network doesn't.",
    icon: ScanLine,
  },
] as const

const N = ITEMS.length

/* ─── Scroll timeline (in vh units of scrolled distance) ─────────────────── */

const LEAD = 25 // scroll before the reel starts moving
const STEP = 60 // scroll per word
const DWELL = 0.22 // fraction of each step the reel rests on a word (each end)
const REVEAL_START = LEAD + (N - 1) * STEP
const REVEAL_LEN = 90
const HOLD = 45
const TOTAL = REVEAL_START + REVEAL_LEN + HOLD // scrollable distance beyond one screen
const SMOOTHING = 0.2 // rAF lerp factor (higher = snappier)

/* ─── Colours (derived from the landing tokens) ──────────────────────────── */

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "")
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const INK_RGB = hexToRgb(BRAND.ink)
const PURPLE_RGB = hexToRgb(BRAND.primary)

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const smoothstep = (t: number) => t * t * (3 - 2 * t)
const mixColor = (w: number) =>
  `rgb(${Math.round(INK_RGB[0] + (PURPLE_RGB[0] - INK_RGB[0]) * w)}, ${Math.round(
    INK_RGB[1] + (PURPLE_RGB[1] - INK_RGB[1]) * w,
  )}, ${Math.round(INK_RGB[2] + (PURPLE_RGB[2] - INK_RGB[2]) * w)})`

/* ─── Shared pieces ──────────────────────────────────────────────────────── */

/** Final screen: heading + illustration. Refs are optional (only the animated layout drives them). */
function FinaleContent({
  kickerRef,
  headingRef,
  artRef,
}: {
  kickerRef?: Ref<HTMLParagraphElement>
  headingRef?: Ref<HTMLHeadingElement>
  artRef?: Ref<HTMLDivElement>
}) {
  return (
    <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center px-4 pb-8 pt-24 text-center sm:px-6">
      <p
        ref={kickerRef}
        className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#6b2fa5]"
      >
        Everything in one place
      </p>
      <h2
        ref={headingRef}
        className="max-w-4xl text-balance text-[clamp(2.1rem,5.2vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-[#171123]"
      >
        All and more is right here on <span className="text-[#6b2fa5]">Spotix</span>
      </h2>
      <div ref={artRef} className="mt-8 rounded-3xl border border-[#ece7f1] bg-white p-4 sm:p-6">
        {/* Plain <img>: a static SVG gains nothing from next/image optimisation */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/reveal.png"
          alt="An organizer at a laptop with a confirmed ticket, a ticket scanner and a phone showing sales"
          width={1060}
          height={668}
          className="block w-auto [--art-h:28svh] sm:[--art-h:34svh] lg:[--art-h:38svh]"
          // Height is definite (and capped so the picture never exceeds the screen width); width follows the ratio
          style={{ height: "min(var(--art-h), calc((100vw - 5rem) / 1.587))" }}
          draggable={false}
        />
      </div>
    </div>
  )
}

/** Soft grid + glow behind the words. Scoped to the section (the original painted the whole body). */
function GridBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: [
          `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(107,47,165,0.08) 0%, transparent 70%)`,
          `linear-gradient(to right, rgba(23,17,35,0.06) 1px, transparent 1px)`,
          `linear-gradient(to bottom, rgba(23,17,35,0.06) 1px, transparent 1px)`,
        ].join(", "),
        backgroundSize: "100% 100%, 48px 48px, 48px 48px",
        WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, #000 25%, transparent 78%)",
        maskImage: "radial-gradient(ellipse 75% 65% at 50% 50%, #000 25%, transparent 78%)",
      }}
    />
  )
}

/* ─── Static layout (prefers-reduced-motion) ─────────────────────────────── */

function StaticLayout() {
  return (
    <section className={`relative py-20 sm:py-24 ${UI.bandWhite}`}>
      <div className={UI.container}>
        <div className="mb-12 max-w-2xl">
          <p className={`${UI.eyebrow} mb-3`}>Everything in one place</p>
          <h2 className={UI.h2}>On Spotix you can…</h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ word, caption, icon: Icon }) => (
            <li key={word} className={`flex items-start gap-4 p-5 ${UI.card}`}>
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#f5f0fb] text-[#6b2fa5]">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-lg font-bold capitalize text-[#171123]">{word.replace(/\.$/, "")}</span>
                <span className="mt-1 block text-sm leading-relaxed text-[#6b6478]">{caption}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="relative mt-16 min-h-[100svh] overflow-hidden bg-[#f7f6f9]">
        <FinaleContent />
      </div>
    </section>
  )
}

/* ─── Animated layout ────────────────────────────────────────────────────── */

export default function ScrollWords() {
  const [reduced, setReduced] = useState(false)

  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const wordsLayerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const wordRefs = useRef<(HTMLLIElement | null)[]>([])
  const captionRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const kickerRef = useRef<HTMLParagraphElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const artRef = useRef<HTMLDivElement>(null)

  // Respect reduced-motion (and react if the user toggles it while the page is open)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    if (reduced) return
    const section = sectionRef.current
    const stage = stageRef.current
    if (!section || !stage) return

    let target = 0
    let current = 0
    let raf = 0
    let running = false

    /** Write every scroll-driven style for scrolled distance `s` (vh units). */
    const apply = (s: number) => {
      // ── Word reel ───────────────────────────────────────────────
      const raw = clamp((s - LEAD) / STEP, 0, N - 1)
      const base = Math.floor(raw)
      const frac = raw - base
      // Rest on each word at both ends of its step, glide in the middle
      const display =
        base >= N - 1 ? N - 1 : base + smoothstep(clamp((frac - DWELL) / (1 - 2 * DWELL), 0, 1))

      if (listRef.current) {
        listRef.current.style.transform = `translate3d(0, ${-(display / N) * 100}%, 0)`
      }

      for (let k = 0; k < N; k++) {
        const d = Math.abs(k - display)
        const w = clamp(1 - d, 0, 1) // 1 on the active word, 0 a full word away
        const fade = clamp(1 - d / 3, 0, 1)

        const li = wordRefs.current[k]
        if (li) {
          li.style.opacity = String(0.14 * fade + 0.86 * w)
          li.style.color = mixColor(w)
        }

        const cap = captionRefs.current[k]
        if (cap) {
          const wc = clamp(1 - d * 2.6, 0, 1)
          cap.style.opacity = String(wc)
          cap.style.transform = `translate3d(0, ${(k > display ? 1 : -1) * (1 - wc) * 10}px, 0)`
        }
      }

      // ── Reveal panel ────────────────────────────────────────────
      const r = clamp((s - REVEAL_START) / REVEAL_LEN, 0, 1)
      const e = easeInOutCubic(r)

      if (wordsLayerRef.current) {
        wordsLayerRef.current.style.opacity = String(1 - 0.9 * e)
        wordsLayerRef.current.style.transform = `scale(${1 - 0.05 * e})`
      }

      if (panelRef.current) {
        panelRef.current.style.transform = `translate3d(0, ${(1 - e) * 100}%, 0) scale(${0.9 + 0.1 * e})`
        panelRef.current.style.borderRadius = `${(1 - e) * 40}px ${(1 - e) * 40}px 0 0`
      }

      const c1 = easeInOutCubic(clamp((r - 0.4) / 0.5, 0, 1))
      const c2 = easeInOutCubic(clamp((r - 0.55) / 0.45, 0, 1))
      if (kickerRef.current) {
        kickerRef.current.style.opacity = String(c1)
        kickerRef.current.style.transform = `translate3d(0, ${(1 - c1) * 16}px, 0)`
      }
      if (headingRef.current) {
        headingRef.current.style.opacity = String(c1)
        headingRef.current.style.transform = `translate3d(0, ${(1 - c1) * 28}px, 0)`
      }
      if (artRef.current) {
        artRef.current.style.opacity = String(c2)
        artRef.current.style.transform = `translate3d(0, ${(1 - c2) * 36}px, 0) scale(${0.96 + 0.04 * c2})`
      }
    }

    const measure = () => {
      const unit = stage.clientHeight / 100 // px per "vh unit", from the real stage height
      const rect = section.getBoundingClientRect()
      target = clamp(-rect.top / unit, -5, TOTAL + 5)
    }

    const tick = () => {
      const diff = target - current
      if (Math.abs(diff) < 0.01) {
        current = target
        running = false
      } else {
        current += diff * SMOOTHING
        raf = requestAnimationFrame(tick)
      }
      apply(current)
    }

    const kick = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(tick)
    }

    const onScroll = () => {
      measure()
      kick()
    }

    // Initial paint: jump straight to the right state (page may load mid-scroll)
    measure()
    current = target
    apply(current)

    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  if (reduced) return <StaticLayout />

  return (
    <section
      ref={sectionRef}
      className={`relative ${UI.bandWhite}`}
      style={{ height: `calc(100svh + ${TOTAL} * 1svh)` }}
      aria-label="What you can do on Spotix"
    >
      {/* Screen readers get one plain sentence; the animated reel below is decorative */}
      <h2 className="sr-only">
        On Spotix you can {ITEMS.map((i) => i.word.replace(/\.$/, "")).join(", ")}. All and more is right here on
        Spotix.
      </h2>

      <div ref={stageRef} className="sticky top-0 h-svh overflow-hidden">
        <GridBackdrop />

        {/* ── Layer 1: the word reel ── */}
        <div
          ref={wordsLayerRef}
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center px-4 pt-20 will-change-transform sm:px-6"
        >
          <p className={`${UI.eyebrow} mb-6 sm:mb-8`}>Everything in one place</p>

          {/* --row = height of one reel row (taller on mobile so long phrases can wrap to two lines) */}
          <div className="flex w-full flex-col items-center gap-1 text-[clamp(2rem,9.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight [--row:2.5em] lg:w-auto lg:flex-row lg:items-center lg:gap-[0.35em] lg:text-[clamp(2.75rem,4.6vw,4.75rem)] lg:[--row:1.3em]">
            <span className="text-[#171123] lg:leading-[var(--row)]">you can</span>

            <div
              className="relative w-full overflow-hidden lg:w-auto"
              style={{
                height: "calc(var(--row) * 3)",
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 30%, #000 70%, transparent 100%)",
                maskImage: "linear-gradient(to bottom, transparent 0%, #000 30%, #000 70%, transparent 100%)",
              }}
            >
              {/* top offset of one row puts the active word in the middle of the three-row viewport */}
              <ul
                ref={listRef}
                className="relative m-0 list-none p-0 text-center will-change-transform lg:text-left"
                style={{ top: "var(--row)", transform: "translate3d(0, 0, 0)" }}
              >
                {ITEMS.map((item, k) => (
                  <li
                    key={item.word}
                    ref={(el) => {
                      wordRefs.current[k] = el
                    }}
                    className="flex items-center justify-center text-balance lg:justify-start lg:whitespace-nowrap"
                    style={{
                      height: "var(--row)",
                      opacity: k === 0 ? 1 : k === 1 ? 0.1 : 0.05,
                      color: k === 0 ? BRAND.primary : BRAND.ink,
                    }}
                  >
                    {item.word}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Caption for the active word */}
          <div className="relative mt-4 h-14 w-full max-w-md sm:mt-6">
            {ITEMS.map((item, k) => (
              <p
                key={item.word}
                ref={(el) => {
                  captionRefs.current[k] = el
                }}
                className={`${UI.lead} absolute inset-x-0 top-0 text-center text-balance`}
                style={{ opacity: k === 0 ? 1 : 0 }}
              >
                {item.caption}
              </p>
            ))}
          </div>
        </div>

        {/* ── Layer 2: the light-grey panel that rises over the reel ── */}
        <div
          ref={panelRef}
          className="absolute inset-0 overflow-hidden bg-[#f7f6f9] will-change-transform"
          style={{
            transform: "translate3d(0, 100%, 0) scale(0.9)",
            transformOrigin: "50% 100%",
            borderRadius: "40px 40px 0 0",
          }}
        >
          <FinaleContent kickerRef={kickerRef} headingRef={headingRef} artRef={artRef} />
        </div>
      </div>
    </section>
  )
}
