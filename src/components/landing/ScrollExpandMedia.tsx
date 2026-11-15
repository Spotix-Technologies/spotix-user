"use client"

/**
 * ScrollExpandMedia — scroll-driven hero.
 *
 * A small image card sits over a full-bleed background image. Scrolling (wheel,
 * touch, keys, or the hint button) expands the card to fill the screen while the
 * title splits apart and the background fades to the page's white. The page itself
 * stays locked until that split animation has fully completed; only then does normal
 * scrolling resume and `children` (the copy below the images) fade in.
 *
 * A dark overlay sits between the images and the title for as long as the title is
 * visible, so the text stays readable over any photo.
 *
 * Presentation only — input capture and scroll locking live in ./hero-scroll.
 */

import type { ReactNode } from "react"
import Image from "next/image"
import { ChevronDown } from "lucide-react"
import { useHeroScrollCapture } from "./hero-scroll/useHeroScrollCapture"
import { useHeroViewport } from "./hero-scroll/useHeroViewport"

interface ScrollExpandMediaProps {
  /** Card image that expands (next/image src) */
  mediaSrc: string
  mediaAlt: string
  /** Full-bleed background image that fades out as the card expands */
  bgImageSrc: string
  /** Overlay title. First word slides left, the rest slides right. */
  title: string
  /** Small line above the title */
  kicker?: string
  /** Hint under the card (button) */
  scrollHint?: string
  /** Content revealed below the images */
  children?: ReactNode
}

export default function ScrollExpandMedia({
  mediaSrc,
  mediaAlt,
  bgImageSrc,
  title,
  kicker,
  scrollHint = "Scroll to explore",
  children,
}: ScrollExpandMediaProps) {
  const { isMobile, reduceMotion } = useHeroViewport()
  const { progress, expanded, animateTo } = useHeroScrollCapture(reduceMotion)

  const mediaWidth = 300 + progress * (isMobile ? 650 : 1250)
  const mediaHeight = 400 + progress * (isMobile ? 200 : 400)
  const shift = progress * (isMobile ? 180 : 150) // vw
  const textOpacity = Math.max(0, 1 - progress * 1.6)
  const contentVisible = expanded || reduceMotion

  const words = title.trim().split(/\s+/)
  const firstWord = words[0] ?? ""
  const restOfTitle = words.slice(1).join(" ")

  return (
    <div className="overflow-x-clip bg-white">
      <section className="relative h-[100dvh] min-h-[560px] w-full overflow-hidden">
        {/* Background image — fades out into the white page */}
        <div className="absolute inset-0 z-0" style={{ opacity: 1 - progress }} aria-hidden="true">
          <Image
            src={bgImageSrc}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#171123]/30" />
        </div>

        {/* Stage sits below the fixed navbar so the card never slides under it */}
        <div className="absolute inset-x-0 bottom-0 top-20 z-10 flex items-center justify-center">
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-[#171123]"
            style={{
              width: `${mediaWidth}px`,
              height: `${mediaHeight}px`,
              maxWidth: "min(94%, 1280px)",
              maxHeight: "calc(100% - 24px)",
              boxShadow: "0 24px 80px rgba(23, 17, 35, 0.35)",
            }}
          >
            <Image
              src={mediaSrc}
              alt={mediaAlt}
              fill
              priority
              sizes="(max-width: 768px) 94vw, 1280px"
              className="object-cover"
            />
            {/* Soft bottom-weighted scrim on the card, lifting as it opens */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#171123]/80 via-[#171123]/25 to-transparent"
              style={{ opacity: 1 - progress }}
            />
          </div>

          {/* Dark overlay — covers the card AND the backdrop behind the title, and fades out
              only as the title does, so white text never ends up over a bright image.
              Extends up by the navbar height (-top-20 matches the stage's top-20) so the
              transparent navbar sits over the same dark tone as the rest of the hero. */}
          <div
            className="pointer-events-none absolute inset-x-0 -top-20 bottom-0 z-[5] bg-[#0d0818]/55"
            style={{ opacity: textOpacity }}
            aria-hidden="true"
          />

          {/* Overlay title */}
          <div className="pointer-events-none relative z-10 flex flex-col items-center gap-3 px-4 text-center text-white">
            {kicker && (
              <p
                className="text-xs font-semibold uppercase tracking-[0.14em] text-white sm:text-sm sm:tracking-[0.2em]"
                style={{
                  transform: `translateX(-${shift}vw)`,
                  opacity: textOpacity,
                  textShadow: "0 1px 12px rgba(0, 0, 0, 0.6)",
                }}
              >
                {kicker}
              </p>
            )}
            <h1
              className="flex flex-col items-center text-5xl font-bold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-7xl xl:text-8xl"
              style={{
                textShadow: "0 2px 28px rgba(0, 0, 0, 0.6), 0 1px 3px rgba(0, 0, 0, 0.45)",
                opacity: textOpacity,
              }}
            >
              <span className="block" style={{ transform: `translateX(-${shift}vw)` }}>
                {firstWord}
              </span>
              {restOfTitle && (
                <span className="block max-w-[92vw]" style={{ transform: `translateX(${shift}vw)` }}>
                  {restOfTitle}
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Scroll hint */}
        {!reduceMotion && (
          <button
            type="button"
            onClick={() => animateTo(1)}
            aria-label="Expand hero and continue"
            tabIndex={expanded ? -1 : 0}
            className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-sm font-medium text-white transition-opacity hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            style={{
              opacity: textOpacity,
              pointerEvents: expanded ? "none" : "auto",
              textShadow: "0 1px 10px rgba(0, 0, 0, 0.6)",
            }}
          >
            {isMobile ? "Swipe up to explore" : scrollHint}
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </button>
        )}
      </section>

      {/* Copy below the images */}
      <div
        className="px-4 py-16 transition-opacity duration-700 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
        style={{ opacity: contentVisible ? 1 : 0 }}
      >
        {children}
      </div>
    </div>
  )
}
