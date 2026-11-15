"use client"

import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import { Instagram, Mail, Heart } from "lucide-react"

/**
 * Spotix footer — playful "sticker" footer.
 *
 * Big brand-purple panel, pill labels, oversized links, floating event-themed
 * stickers (all inline SVG, no image assets) and a giant "Spotix" wordmark
 * that bleeds off the bottom edge.
 *
 * Colors come from the Spotix brand tokens (components/landing/theme.ts):
 * panel #6b2fa5, tint/cream #f5f0fb, ink #171123, light purple #c4a0ee,
 * accent blue #2e8ae0. Sticker pops (yellow / orange / pink) are used only
 * on the stickers themselves.
 */

const CREAM = "#f5f0fb"
const INK = "#171123"

const CONTACT_EMAIL = "support@spotix.com"
const INSTAGRAM = "https://instagram.com/spotixnigeria"

/* ------------------------------------------------------------------ */
/* Stickers                                                            */
/* ------------------------------------------------------------------ */

function starPoints(cx: number, cy: number, outer: number, inner: number, n: number) {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI * i) / n - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(" ")
}

/** White sticker border: silhouette drawn fat + white underneath, art on top. */
function Sticker({ viewBox, silhouette, children }: { viewBox: string; silhouette: ReactNode; children: ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      className="block h-auto w-full overflow-visible drop-shadow-[0_6px_6px_rgba(23,17,35,0.28)]"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="#fff" stroke="#fff" strokeWidth={9} strokeLinejoin="round" strokeLinecap="round">
        {silhouette}
      </g>
      {children}
    </svg>
  )
}

function BurstSticker() {
  const pts = starPoints(50, 50, 48, 35, 12)
  return (
    <Sticker viewBox="0 0 100 100" silhouette={<polygon points={pts} />}>
      <polygon points={pts} fill="#ff6b2c" />
      <polygon points={starPoints(50, 50, 40, 29, 12)} fill="none" stroke="#ff9a5c" strokeWidth={2} strokeLinejoin="round" />
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontSize="24"
        fontWeight="900"
        fill={INK}
        fontFamily='"Arial Black", "Helvetica Neue", Arial, sans-serif'
        textLength="58"
        lengthAdjust="spacingAndGlyphs"
        transform="rotate(-8 50 50)"
      >
        live!
      </text>
    </Sticker>
  )
}

function SmileySticker() {
  return (
    <Sticker viewBox="0 0 100 100" silhouette={<circle cx="50" cy="50" r="44" />}>
      <circle cx="50" cy="50" r="44" fill="#c4a0ee" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="#dcc6f6" strokeWidth={3} />
      <ellipse cx="36" cy="40" rx="4.5" ry="7" fill="#fff" />
      <ellipse cx="64" cy="40" rx="4.5" ry="7" fill="#fff" />
      <path d="M26 56 Q50 80 74 56" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" />
    </Sticker>
  )
}

function HeartSticker() {
  const heart =
    "M50 90 C 8 60, 4 28, 27 19 C 40 14, 48 23, 50 30 C 52 23, 60 14, 73 19 C 96 28, 92 60, 50 90 Z"
  const sparkle = "M0 -10 Q0 0 10 0 Q0 0 0 10 Q0 0 -10 0 Q0 0 0 -10Z"
  return (
    <Sticker
      viewBox="0 0 100 100"
      silhouette={
        <>
          <path d={heart} />
          <path d={sparkle} transform="translate(88 18) scale(1.1)" />
          <path d={sparkle} transform="translate(10 82) scale(0.9)" />
        </>
      }
    >
      <path d={heart} fill="#c0245f" />
      <path d="M22 34 Q24 26 33 26" fill="none" stroke="#ff7fae" strokeWidth={5} strokeLinecap="round" />
      <path d={sparkle} transform="translate(88 18) scale(1.1)" fill="#ffd0e4" />
      <path d={sparkle} transform="translate(10 82) scale(0.9)" fill="#ffd0e4" />
    </Sticker>
  )
}

function FlowerSticker() {
  const petals = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 10
    return { cx: 50 + 29 * Math.cos(a), cy: 50 + 29 * Math.sin(a) }
  })
  return (
    <Sticker
      viewBox="0 0 100 100"
      silhouette={
        <>
          {petals.map((p, i) => (
            <circle key={i} cx={p.cx} cy={p.cy} r={15} />
          ))}
          <circle cx="50" cy="50" r="24" />
        </>
      }
    >
      {petals.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={15} fill="#ffd23f" />
      ))}
      <circle cx="50" cy="50" r="24" fill="#ffd23f" />
      <circle cx="50" cy="50" r="18" fill="#ff6b2c" />
      <circle cx="43" cy="46" r="2.6" fill={INK} />
      <circle cx="57" cy="46" r="2.6" fill={INK} />
      <path d="M42 54 Q50 62 58 54" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
    </Sticker>
  )
}

function BubbleSticker() {
  const body = "M14 10 H86 Q96 10 96 20 V56 Q96 66 86 66 H58 L34 90 L36 66 H14 Q4 66 4 56 V20 Q4 10 14 10 Z"
  return (
    <Sticker viewBox="0 0 100 100" silhouette={<path d={body} />}>
      <path d={body} fill="#ffb3d9" />
      <text
        x="50"
        y="52"
        textAnchor="middle"
        fontSize="34"
        fontWeight="900"
        fill="#7a1650"
        fontFamily='"Arial Black", "Helvetica Neue", Arial, sans-serif'
        textLength="52"
        lengthAdjust="spacingAndGlyphs"
        transform="rotate(-5 50 40)"
      >
        hi!
      </text>
    </Sticker>
  )
}

function TicketSticker() {
  const body =
    "M12 8 H108 Q114 8 114 14 V32 A10 10 0 0 0 114 52 V70 Q114 76 108 76 H12 Q6 76 6 70 V52 A10 10 0 0 0 6 32 V14 Q6 8 12 8 Z"
  return (
    <Sticker viewBox="0 0 120 84" silhouette={<path d={body} />}>
      <path d={body} fill={INK} />
      <line x1="84" y1="14" x2="84" y2="70" stroke="#c4a0ee" strokeWidth={2.5} strokeDasharray="4 5" strokeLinecap="round" />
      <polygon points={starPoints(42, 42, 20, 9, 5)} fill="#ffd23f" />
      <rect x="92" y="26" width="14" height="5" rx="2.5" fill="#2e8ae0" />
      <rect x="92" y="37" width="14" height="5" rx="2.5" fill="#c4a0ee" />
      <rect x="92" y="48" width="14" height="5" rx="2.5" fill="#ff6b2c" />
    </Sticker>
  )
}

type Placement = {
  key: string
  node: ReactNode
  left: string
  top: string
  width: string
  rotate: number
  delay: string
}

const stickers: Placement[] = [
  { key: "burst", node: <BurstSticker />, left: "7%", top: "10%", width: "11%", rotate: -12, delay: "0s" },
  { key: "smiley", node: <SmileySticker />, left: "21%", top: "-14%", width: "12%", rotate: -6, delay: "0.6s" },
  { key: "heart", node: <HeartSticker />, left: "37%", top: "6%", width: "10%", rotate: 10, delay: "1.2s" },
  { key: "flower", node: <FlowerSticker />, left: "52%", top: "-22%", width: "13%", rotate: 8, delay: "0.3s" },
  { key: "bubble", node: <BubbleSticker />, left: "70%", top: "14%", width: "10%", rotate: 6, delay: "0.9s" },
  { key: "ticket", node: <TicketSticker />, left: "83%", top: "-8%", width: "13%", rotate: 14, delay: "1.5s" },
]

/* ------------------------------------------------------------------ */
/* Links                                                               */
/* ------------------------------------------------------------------ */

const bigLink =
  "inline-block text-2xl font-extrabold leading-tight tracking-tight text-[#f5f0fb] transition-colors hover:text-white hover:underline hover:decoration-wavy hover:decoration-2 hover:underline-offset-[10px] focus-visible:underline focus-visible:decoration-wavy focus-visible:decoration-2 focus-visible:underline-offset-[10px] focus-visible:outline-none sm:text-3xl"

const smallLink =
  "text-sm text-white/75 transition-colors hover:text-white hover:underline hover:underline-offset-4 focus-visible:text-white focus-visible:underline focus-visible:outline-none"

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#f5f0fb] px-4 py-1.5 text-sm font-semibold text-[#171123]">
      {children}
    </span>
  )
}

const iconBox =
  "flex size-12 items-center justify-center rounded-xl border-2 border-[#f5f0fb]/60 text-[#f5f0fb] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#f5f0fb] hover:bg-[#f5f0fb] hover:text-[#6b2fa5] focus-visible:border-[#f5f0fb] focus-visible:bg-[#f5f0fb] focus-visible:text-[#6b2fa5] focus-visible:outline-none"

function openLiveChat() {
  const tawk = (window as unknown as { Tawk_API?: { maximize?: () => void } }).Tawk_API
  if (tawk?.maximize) tawk.maximize()
  else window.open("https://spotix.tawk.help", "_blank", "noopener,noreferrer")
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    // Strip color must match the wordmark fill (CREAM = #f5f0fb) so the letters blend into it.
    <footer className="mt-auto w-full bg-[#f5f0fb] pb-[clamp(0.5rem,1.6vw,1.5rem)]">
      <style>{`
        @keyframes spotix-float {
          0%, 100% { transform: translateY(0) rotate(var(--r)); }
          50% { transform: translateY(-8px) rotate(calc(var(--r) + 3deg)); }
        }
        .spotix-sticker { animation: spotix-float 5s ease-in-out infinite; transition: scale .2s ease; }
        .spotix-sticker:hover { scale: 1.12; }
        @media (prefers-reduced-motion: reduce) {
          .spotix-sticker { animation: none; transform: rotate(var(--r)); }
        }
      `}</style>

      <div className="relative w-full overflow-hidden bg-[#6b2fa5] text-white">
        {/* Soft depth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-[#8b4fc7]/40 blur-3xl"
        />

        <div className="relative mx-auto max-w-screen-xl px-5 pt-14 sm:px-8 lg:px-10 lg:pt-20">
          {/* Three feature columns */}
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
            {/* Discover */}
            <div>
              <Pill>discover</Pill>
              <ul className="mt-8 space-y-2">
                <li>
                  <Link href="/discover" className={bigLink}>Discover events</Link>
                </li>
                <li>
                  <Link href="/ticket-history" className={bigLink}>My tickets</Link>
                </li>
                <li>
                  <Link href="/Referrals" className={bigLink}>Referrals</Link>
                </li>
              </ul>
              <a
                href="https://booker.spotix.com.ng/create-event"
                target="_blank"
                rel="noopener noreferrer"
                className={`${smallLink} mt-6 inline-block`}
              >
                Hosting an event? Create one &rarr;
              </a>
            </div>

            {/* Support */}
            <div>
              <Pill>support</Pill>
              <ul className="mt-8 space-y-2">
                <li>
                  <a href="https://spotix.tawk.help" target="_blank" rel="noopener noreferrer" className={bigLink}>
                    Help center
                  </a>
                </li>
                <li>
                  <button type="button" onClick={openLiveChat} className={`${bigLink} inline-flex items-center gap-3 text-left`}>
                    Live chat
                    <span className="relative flex size-2.5" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#c4a0ee] opacity-75 motion-reduce:animate-none" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-[#c4a0ee]" />
                    </span>
                  </button>
                </li>
              </ul>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                <li><Link href="/refund" className={smallLink}>Request a refund</Link></li>
                <li><Link href="/refund-track" className={smallLink}>Track a refund</Link></li>
                <li>
                  <a href="https://policy.spotix.com.ng" target="_blank" rel="noopener noreferrer" className={smallLink}>
                    Privacy &amp; terms
                  </a>
                </li>
                <li>
                  <a href="https://blog.spotix.com.ng" target="_blank" rel="noopener noreferrer" className={smallLink}>
                    Blog
                  </a>
                </li>
                <li>
                  <a href="https://spotix.com.ng/pricing" target="_blank" rel="noopener noreferrer" className={smallLink}>
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <Pill>contact</Pill>
              <p className="mt-8">
                <a href={`mailto:${CONTACT_EMAIL}`} className={`${bigLink} break-all`}>
                  {CONTACT_EMAIL}
                </a>
              </p>
              <p className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-[#f5f0fb] sm:text-3xl">
                say hi on chat*
              </p>
              <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/70">
                *Stuck on a ticket or payment? Open Live chat and our team will pick it up from there.
              </p>
              <ul className="mt-6 flex gap-3">
                <li>
                  <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Spotix on Instagram" className={iconBox}>
                    <Instagram className="size-5" />
                  </a>
                </li>
                <li>
                  <a href={`mailto:${CONTACT_EMAIL}`} aria-label="Email Spotix support" className={iconBox}>
                    <Mail className="size-5" />
                  </a>
                </li>
              </ul>

              {/* Better Stack status badge — dark theme (light text) so it reads directly on the purple panel */}
              <div className="mt-6 max-w-full">
                <iframe
                  title="Spotix status badge"
                  src="https://status.spotix.com.ng/badge?theme=dark"
                  width={250}
                  height={30}
                  frameBorder={0}
                  scrolling="no"
                  loading="lazy"
                  style={{ colorScheme: "normal", maxWidth: "100%" }}
                />
              </div>
            </div>
          </div>

          {/* Legal row */}
          <div className="mt-16 flex flex-col items-start gap-2 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between lg:mt-24">
            <p>
              &copy; {currentYear} <span className="font-semibold text-[#f5f0fb]">Spotix Technologies</span>. All rights reserved.
            </p>
            <p className="flex items-center gap-1.5">
              Made with
              <Heart className="size-4 fill-[#ff7fae] text-[#ff7fae] motion-safe:animate-pulse" aria-label="love" />
              for event enthusiasts
            </p>
          </div>
        </div>

        {/* Wordmark + stickers — full panel width, letters bleed off the bottom edge */}
        {/* Letters are cropped by the panel's bottom edge; the white strip below is the footer's own padding */}
        <div className="mt-24 w-full sm:mt-40">
         {/* Positioning context for the stickers; the clip box below crops the letters */}
         <div className="relative w-full">
          <div className="overflow-hidden">
          <svg
            viewBox="0 0 1000 300"
            className="block h-auto w-full select-none"
            role="img"
            aria-label="Spotix"
          >
            {/* Baseline sits just inside the clip edge; the stroke + clip box make every letter run into it */}
            <text
              x="500"
              y="294"
              textAnchor="middle"
              fontSize="330"
              fontWeight="900"
              fill={CREAM}
              stroke={CREAM}
              strokeWidth={16}
              strokeLinejoin="round"
              fontFamily='"Arial Black", "Helvetica Neue", Arial, sans-serif'
              textLength="970"
              lengthAdjust="spacingAndGlyphs"
            >
              Spotix
            </text>
          </svg>
          </div>

          {stickers.map((s) => (
            <div
              key={s.key}
              className="spotix-sticker absolute scale-[1.35] sm:scale-100"
              style={
                {
                  left: s.left,
                  top: s.top,
                  width: s.width,
                  "--r": `${s.rotate}deg`,
                  animationDelay: s.delay,
                } as CSSProperties
              }
            >
              {s.node}
            </div>
          ))}
         </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
