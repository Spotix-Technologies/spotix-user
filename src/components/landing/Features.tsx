"use client"

import { useEffect, useRef } from "react"
import Spline from "@splinetool/react-spline"
import { Wallet, Users, ShieldCheck, Zap, Star, TrendingUp, ScanLine } from "lucide-react"
import { getLenis } from "./useLenis"

const features = [
  {
    icon: Wallet,
    title: "Secure Payments",
    description: "Fast and reliable transactions with industry-leading encryption and payment protection. Every naira is secured.",
    color: "from-green-400 to-emerald-500",
    iconBg: "bg-green-100",
    textColor: "text-green-600",
    number: "01",
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Connect with like-minded event-goers and build lasting memories together. Find your tribe at every event.",
    color: "from-blue-400 to-cyan-500",
    iconBg: "bg-blue-100",
    textColor: "text-blue-600",
    number: "02",
  },
  {
    icon: ShieldCheck,
    title: "Safe & Verified",
    description: "All events are verified for authenticity. Your safety is our top priority, from purchase to entry.",
    color: "from-purple-400 to-pink-500",
    iconBg: "bg-purple-100",
    textColor: "text-purple-600",
    number: "03",
  },
  {
    icon: Zap,
    title: "Instant Booking",
    description: "Book tickets in seconds with our lightning-fast checkout process. No waiting, no friction.",
    color: "from-yellow-400 to-orange-500",
    iconBg: "bg-yellow-100",
    textColor: "text-yellow-600",
    number: "04",
  },
  {
    icon: Star,
    title: "Premium Experience",
    description: "Enjoy VIP treatment with exclusive perks and early access to the hottest events before anyone else.",
    color: "from-pink-400 to-rose-500",
    iconBg: "bg-pink-100",
    textColor: "text-pink-600",
    number: "05",
  },
  {
    icon: TrendingUp,
    title: "Trending Events",
    description: "Stay ahead of the curve with real-time insights on the hottest upcoming events in your city.",
    color: "from-indigo-400 to-purple-500",
    iconBg: "bg-indigo-100",
    textColor: "text-indigo-600",
    number: "06",
  },
  {
    icon: ScanLine,
    title: "Offline Ticket Scanning",
    description: "Scan tickets offline with our built-in QR scanner. Works without internet — perfect for venues with poor connectivity.",
    color: "from-teal-400 to-cyan-500",
    iconBg: "bg-teal-100",
    textColor: "text-teal-600",
    number: "07",
  },
]

export default function Features() {
  // Mobile refs
  const mobileHeadingRef = useRef<HTMLDivElement>(null)
  const mobileLineRef = useRef<HTMLDivElement>(null)
  const mobileItemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Desktop refs
  const desktopHeadingRef = useRef<HTMLDivElement>(null)
  const desktopLineRef = useRef<HTMLDivElement>(null)
  const desktopItemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Layout refs for Lenis-driven pinning
  const sectionRef = useRef<HTMLElement>(null)
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const splineWrapperRef = useRef<HTMLDivElement>(null)
  const rightColRef = useRef<HTMLDivElement>(null)

  // Spline
  const ticketRef = useRef<any>(null)

  function onSplineLoad(app: any) {
    ticketRef.current = app.findObjectByName("Ticket")
  }

  // ── Bidirectional card / heading animations via IntersectionObserver ──
  // We use TWO thresholds: entering (0.1) triggers is-visible,
  // a disconnect-free approach: we never unobserve, so leaving the viewport
  // removes is-visible and re-entering re-adds it.
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    // For headings/lines: simple toggle
    const observeToggle = (el: Element | null, threshold = 0.3) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add("is-visible")
          } else {
            el.classList.remove("is-visible")
          }
        },
        { threshold }
      )
      obs.observe(el)
      observers.push(obs)
    }

    // For cards: toggle based on intersection
    const observeCard = (el: HTMLDivElement | null) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add("is-visible")
          } else {
            el.classList.remove("is-visible")
          }
        },
        {
          threshold: 0.12,
          // Slightly negative top margin so cards animate when they're
          // meaningfully in view, not just 1px over the fold
          rootMargin: "0px 0px -40px 0px",
        }
      )
      obs.observe(el)
      observers.push(obs)
    }

    observeToggle(mobileHeadingRef.current, 0.3)
    observeToggle(mobileLineRef.current, 0.5)
    mobileItemRefs.current.forEach((el, i) => {
      if (!el) return
      el.style.setProperty("--i", String(i % 4))
      observeCard(el)
    })

    observeToggle(desktopHeadingRef.current, 0.3)
    observeToggle(desktopLineRef.current, 0.5)
    desktopItemRefs.current.forEach((el, i) => {
      if (!el) return
      el.style.setProperty("--i", String(i % 4))
      observeCard(el)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  // ── Lenis-driven manual pinning for left panel + Spline ──
  //
  // Strategy:
  //   • While the section is on screen and the last card hasn't scrolled past
  //     the viewport centre, keep left panel and Spline at a fixed visual
  //     position by applying a compensating translateY that cancels scroll.
  //   • Once the bottom of the section approaches, let them scroll naturally
  //     (i.e. stop compensating) so the whole section exits together.
  //   • This works with Lenis because we're reading lenis.scroll (the
  //     virtualised scroll position) and writing CSS transforms each frame.
  //
  useEffect(() => {
    // Only run on desktop (lg = 1024px)
    if (typeof window === "undefined" || window.innerWidth < 1024) return

    let attempt = 0
    let cleanup: (() => void) | null = null

    function attach() {
      const lenis = getLenis()
      if (!lenis) {
        if (attempt++ < 40) setTimeout(attach, 100)
        return
      }

      function onScroll({ scroll }: { scroll: number }) {
        const section = sectionRef.current
        const leftPanel = leftPanelRef.current
        const splineEl = splineWrapperRef.current
        const rightCol = rightColRef.current
        if (!section || !leftPanel || !splineEl || !rightCol) return

        // Absolute position of the section top
        const sectionTop = section.offsetTop
        const sectionHeight = section.offsetHeight
        const vh = window.innerHeight

        // How far the user has scrolled INTO the section
        const scrolledIntoSection = scroll - sectionTop

        // The left panel's natural "resting" top relative to the section
        // (the same offset it would have at scroll=sectionTop i.e. when the
        // section first hits the top of the viewport)
        // We want to pin the left panel so it stays at that visual position.

        // When section enters viewport (scroll >= sectionTop - vh),
        // the left panel should appear to be stuck.
        // We achieve this by translating it DOWN by however many px the user
        // has scrolled since the section top entered the viewport.

        // "Pinning window": from when section top hits viewport top
        //   until the section bottom is about to leave (with some buffer).
        const pinStart = sectionTop           // section top at viewport top
        const pinEnd   = sectionTop + sectionHeight - vh  // section bottom at viewport bottom

        if (scroll < pinStart) {
          // Section hasn't reached viewport top yet — no compensation needed
          leftPanel.style.transform = "translateY(0px)"
          splineEl.style.transform  = "translateY(0px)"
        } else if (scroll >= pinStart && scroll <= pinEnd) {
          // We're inside the section — compensate scroll to pin
          const offset = scroll - pinStart
          leftPanel.style.transform = `translateY(${offset}px)`
          splineEl.style.transform  = `translateY(${offset}px)`
        } else {
          // Past the end — let the section scroll away naturally
          const offset = pinEnd - pinStart
          leftPanel.style.transform = `translateY(${offset}px)`
          splineEl.style.transform  = `translateY(${offset}px)`
        }

        // Ticket rotation driven by progress through section
        if (ticketRef.current) {
          const progress = Math.min(1, Math.max(0,
            (scroll - sectionTop + vh) / (sectionHeight + vh)
          ))
          ticketRef.current.rotation.y = progress * Math.PI * 4
        }
      }

      lenis.on("scroll", onScroll)
      // Fire once immediately to set initial positions
      onScroll({ scroll: window.scrollY ?? 0 } as any)

      cleanup = () => lenis.off("scroll", onScroll)
    }

    attach()

    // Re-attach on resize in case breakpoint changes
    function onResize() {
      cleanup?.()
      attach()
    }
    window.addEventListener("resize", onResize)

    return () => {
      cleanup?.()
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden"
    >
      {/* Ambient blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      {/*
        ── Spline 3D ticket ──
        Absolutely positioned relative to the SECTION (not the viewport).
        Lenis scroll handler moves it with translateY to simulate pinning.
        pointer-events-none so cards remain interactive.
      */}
      <div
        ref={splineWrapperRef}
        className="absolute right-[-60px] top-12 w-[520px] h-[520px] lg:w-[680px] lg:h-[680px] pointer-events-none z-0"
        style={{
          opacity: 0.18,
          willChange: "transform",
          maskImage: "radial-gradient(ellipse 75% 75% at 65% 50%, black 35%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 75% at 65% 50%, black 35%, transparent 75%)",
        }}
      >
        <Spline
          scene="https://prod.spline.design/w8Lk-AjbOcPnmyWP/scene.splinecode"
          onLoad={onSplineLoad}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* All content sits above the ticket at z-10 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ── MOBILE ── */}
        <div className="lg:hidden py-16">
          <div ref={mobileHeadingRef} className="feat-heading text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-[#6b2fa5] via-purple-600 to-pink-500 bg-clip-text text-transparent">
              Why Choose Spotix?
            </h2>
            <div
              ref={mobileLineRef}
              className="feat-line w-24 h-1 bg-gradient-to-r from-[#6b2fa5] to-purple-600 mx-auto rounded-full"
            />
            <p className="mt-6 text-lg text-gray-600 max-w-xl mx-auto">
              Experience the future of event booking with our cutting-edge features
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  ref={(el) => { mobileItemRefs.current[i] = el }}
                  className="feat-card relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl border-2 border-gray-100 hover:border-transparent group hover:-translate-y-1 transition-all duration-500"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} p-0.5 mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                    <div className={`w-full h-full ${f.iconBg} rounded-2xl flex items-center justify-center`}>
                      <Icon className={`w-7 h-7 ${f.textColor}`} />
                    </div>
                  </div>
                  <span className="absolute top-4 right-4 text-xs font-bold text-gray-300">{f.number}</span>
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-[#6b2fa5] transition-colors">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>
                  <div className={`mt-4 h-0.5 bg-gradient-to-r ${f.color} w-0 group-hover:w-full transition-all duration-500`} />
                </div>
              )
            })}
          </div>
        </div>

        {/* ── DESKTOP: manually-pinned left + scrolling right ── */}
        <div className="hidden lg:flex gap-0 items-start">

          {/*
            Left panel — NOT sticky. Position is driven entirely by
            Lenis onScroll via translateY. We use `will-change: transform`
            and set an explicit top offset matching the padding of the
            right column so it lines up visually.
          */}
          <div
            ref={leftPanelRef}
            className="w-[38%] flex-shrink-0"
            style={{ willChange: "transform" }}
          >
            <div ref={desktopHeadingRef} className="feat-heading pl-4 xl:pl-8 pr-10 pt-24 relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-full mb-6">
                <div className="w-1.5 h-1.5 bg-[#6b2fa5] rounded-full animate-pulse" />
                <span className="text-xs font-bold text-[#6b2fa5] uppercase tracking-widest">Platform Features</span>
              </div>
              <h2 className="text-5xl xl:text-6xl font-bold text-gray-900 leading-[1.05] mb-4">
                Why<br />
                <span className="bg-gradient-to-r from-[#6b2fa5] via-purple-600 to-pink-500 bg-clip-text text-transparent">Choose</span>
                <br />Spotix?
              </h2>
              <div
                ref={desktopLineRef}
                className="feat-line w-20 h-1.5 bg-gradient-to-r from-[#6b2fa5] to-purple-600 rounded-full mb-6"
              />
              <p className="text-gray-500 text-lg leading-relaxed max-w-xs">
                Everything you need to discover, book, and enjoy events across Nigeria — all in one place.
              </p>
              <div className="mt-10 flex items-center gap-3">
                <div className="flex gap-1">
                  {features.map((_, i) => (
                    <div key={i} className="h-1 w-2 rounded-full bg-gradient-to-r from-[#6b2fa5] to-purple-600" />
                  ))}
                </div>
                <span className="text-sm text-gray-400 font-medium">{features.length} features</span>
              </div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 border-2 border-purple-100 rounded-full opacity-50 pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 border-2 border-pink-100 rounded-full opacity-50 pointer-events-none" />
            </div>
          </div>

          {/* Right scrolling list — this is what actually scrolls */}
          <div ref={rightColRef} className="w-[62%] py-24 space-y-6 pl-8">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  ref={(el) => { desktopItemRefs.current[i] = el }}
                  className="feat-card group relative bg-white rounded-2xl p-7 shadow-md hover:shadow-2xl border-2 border-gray-100 hover:border-transparent overflow-hidden cursor-default transition-shadow duration-500"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500 rounded-2xl`} />
                  <div className="absolute -top-8 -right-8 w-28 h-28 bg-gradient-to-br from-purple-100/40 to-pink-100/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative flex items-start gap-5">
                    <div className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} p-0.5 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                      <div className={`w-full h-full ${f.iconBg} rounded-2xl flex items-center justify-center`}>
                        <Icon className={`w-7 h-7 ${f.textColor}`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-[#6b2fa5] group-hover:to-purple-600 group-hover:bg-clip-text transition-all duration-300">
                          {f.title}
                        </h3>
                        <span className="text-sm font-bold text-gray-200 group-hover:text-gray-300 transition-colors">{f.number}</span>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{f.description}</p>
                    </div>
                  </div>
                  <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r ${f.color} transition-all duration-500 w-0 group-hover:w-full`} />
                </div>
              )
            })}
            {/* Bottom padding so the last card can fully clear the viewport */}
            <div className="h-24" />
          </div>
        </div>
      </div>

      <style jsx>{`
        /* ── Heading reveal ── */
        .feat-heading {
          opacity: 0;
          transform: translateX(-40px);
          transition: opacity 0.9s ease, transform 0.9s ease;
        }
        .feat-heading.is-visible {
          opacity: 1;
          transform: translateX(0);
        }

        /* ── Underline grow ── */
        .feat-line {
          transform: scaleX(0);
          transform-origin: left center;
          transition: transform 1s 0.35s ease;
        }
        .feat-line.is-visible {
          transform: scaleX(1);
        }

        /*
          ── Card reveal ──
          Cards slide in from the right when entering the viewport
          and slide back out to the right when leaving.
          --i drives a staggered delay (capped at 3 steps so it never
          feels sluggish for later cards).
        */
        .feat-card {
          opacity: 0;
          transform: translateX(48px);
          /*
            Two separate transitions:
            1. The reveal animation (opacity + transform) — uses --i stagger.
            2. The hover effects (box-shadow, border-color) — always instant-ish.
            We list them together so neither overrides the other.
          */
          transition:
            opacity    0.55s calc(var(--i, 0) * 55ms) cubic-bezier(0.22, 1, 0.36, 1),
            transform  0.55s calc(var(--i, 0) * 55ms) cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.5s  ease,
            border-color 0.5s ease;
        }
        .feat-card.is-visible {
          opacity: 1;
          transform: translateX(0);
        }
      `}</style>
    </section>
  )
}