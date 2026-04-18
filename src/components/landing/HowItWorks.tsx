"use client"

import { useEffect, useRef } from "react"
import { CheckCircle, PlusCircle, Share2, BarChart2, Ticket, Search, CreditCard, Sparkles } from "lucide-react"
import Link from "next/link"
import { getLenis } from "./useLenis"

/**
 * HowItWorks — Lenis-driven horizontal scroll. No card fading.
 *
 * A tall wrapper gives vertical scroll room. A sticky 100vh viewport
 * contains the horizontal track. On each Lenis scroll event, we read
 * the wrapper's bounding rect to compute progress 0→1, then translate
 * the track by -(progress * maxTranslate).
 *
 * Cards are always fully visible — no opacity tricks.
 */

const organizerSteps = [
  { icon: CheckCircle, number: "01", title: "Sign Up as a Booker", subtitle: "Create your organizer account", description: "Register on Spotix Bookers and set up your organizer profile. Verify your identity and get access to the full event management dashboard.", color: "from-violet-500 to-purple-600", bgColor: "bg-violet-50", textColor: "text-violet-600", accent: "#7c3aed", pill: "For Organizers" },
  { icon: PlusCircle, number: "02", title: "Create Your Event", subtitle: "Set up in minutes", description: "Add event details, venue, dates, and ticket tiers. Upload a cover image, set prices and quantities — Spotix handles the rest.", color: "from-pink-500 to-rose-600", bgColor: "bg-pink-50", textColor: "text-pink-600", accent: "#e11d48", pill: "For Organizers" },
  { icon: Share2, number: "03", title: "Share Event Links", subtitle: "Reach your audience", description: "Get a unique shareable link for your event. Post across socials, WhatsApp, or embed on your website. Watch registrations come in live.", color: "from-orange-400 to-amber-500", bgColor: "bg-orange-50", textColor: "text-orange-600", accent: "#f59e0b", pill: "For Organizers" },
  { icon: BarChart2, number: "04", title: "Monitor Your Stats", subtitle: "Real-time analytics", description: "Track ticket sales, revenue, and attendee data from your dashboard. Scan tickets offline at the gate and monitor everything in one place.", color: "from-teal-400 to-cyan-500", bgColor: "bg-teal-50", textColor: "text-teal-600", accent: "#0891b2", pill: "For Organizers" },
]

const buyerSteps = [
  { icon: Search, number: "05", title: "Discover Events", subtitle: "Find your next vibe", description: "Browse featured and themed events on Spotix. Filter by date, type, or city. Find exactly what matches your mood.", color: "from-blue-500 to-indigo-600", bgColor: "bg-blue-50", textColor: "text-blue-600", accent: "#3b82f6", pill: "For Buyers" },
  { icon: CreditCard, number: "06", title: "Book Instantly", subtitle: "Secure & seamless", description: "Select your ticket type and pay securely with Paystack. Your ticket is generated instantly and sent to your account.", color: "from-emerald-400 to-green-500", bgColor: "bg-emerald-50", textColor: "text-emerald-600", accent: "#10b981", pill: "For Buyers" },
  { icon: Ticket, number: "07", title: "Attend & Enjoy", subtitle: "Show up and vibe", description: "Present your QR ticket at the gate — online or offline. Get scanned in seconds and experience the event. Easy as that.", color: "from-purple-500 to-fuchsia-600", bgColor: "bg-purple-50", textColor: "text-purple-600", accent: "#9333ea", pill: "For Buyers" },
]

type Step = typeof organizerSteps[0]

function StepCard({ step }: { step: Step }) {
  const Icon = step.icon
  return (
    <div
      className="hiw-card flex-shrink-0 relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-7 hover:bg-white/[0.08] transition-colors duration-300"
      style={{ width: "min(340px, 78vw)" }}
    >
      <div className={`absolute top-0 left-8 right-8 h-px bg-gradient-to-r ${step.color}`} />
      <div className="flex items-center justify-between mb-5">
        <span
          className={`px-3 py-1 text-xs font-bold rounded-full border ${
            step.pill === "For Organizers"
              ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
              : "bg-blue-500/20 text-blue-300 border-blue-500/30"
          }`}
        >
          {step.pill}
        </span>
        <span className="text-4xl font-black text-white/10">{step.number}</span>
      </div>
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${step.color} p-0.5 mb-5`}>
        <div className={`w-full h-full ${step.bgColor} rounded-2xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${step.textColor}`} />
        </div>
      </div>
      <h3 className="text-xl font-bold text-white mb-1">{step.title}</h3>
      <p className="text-sm font-medium mb-3" style={{ color: step.accent }}>{step.subtitle}</p>
      <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
      <div className={`mt-5 h-0.5 bg-gradient-to-r ${step.color} opacity-30 rounded-full`} />
    </div>
  )
}

export default function HowItWorks() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Header reveal
    const header = headerRef.current
    if (header) {
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) { header.classList.add("hiw-visible"); obs.disconnect() } },
        { threshold: 0.3 }
      )
      obs.observe(header)
    }

    // Lenis horizontal scroll
    let attempt = 0
    let cleanup: (() => void) | null = null

    function attach() {
      const lenis = getLenis()
      if (!lenis) {
        if (attempt++ < 40) setTimeout(attach, 100)
        return
      }

      function onScroll() {
        const wrapper = wrapperRef.current
        const track = trackRef.current
        const sticky = stickyRef.current
        if (!wrapper || !track || !sticky) return

        const totalScrollPx = wrapper.offsetHeight - window.innerHeight
        if (totalScrollPx <= 0) return

        const wTop = wrapper.getBoundingClientRect().top
        const progress = Math.min(1, Math.max(0, -wTop / totalScrollPx))

        const maxTranslate = track.scrollWidth - sticky.clientWidth
        track.style.transform = `translateX(${-progress * maxTranslate}px)`

        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${progress})`
        }
      }

      lenis.on("scroll", onScroll)
      onScroll()
      cleanup = () => lenis.off("scroll", onScroll)
    }

    attach()
    return () => { cleanup?.() }
  }, [])

  // Tall wrapper height: enough vertical scroll to traverse the full track width.
  // We overshoot slightly; JS clamps to actual maxTranslate.
  const totalCards = organizerSteps.length + buyerSteps.length
  const wrapperHeight = `calc(100vh + ${totalCards * 400}px)`

  return (
    <section id="how-it-works" className="relative bg-gray-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(107,47,165,0.2)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.15)_0%,transparent_60%)] pointer-events-none" />

      {/* Header — scrolls away normally before the sticky kicks in */}
      <div ref={headerRef} className="hiw-header max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-6 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-purple-300">Step by Step</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white">
            How It{" "}
            <span className="bg-gradient-to-r from-[#6b2fa5] via-purple-400 to-pink-500 bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Scroll through the journey — for event organizers and ticket buyers alike
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
            <span>Scroll to explore</span>
            <svg className="w-4 h-4 rotate-90 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="sticky top-0 z-50 h-[2px] bg-white/5">
        <div
          ref={progressRef}
          className="h-full bg-gradient-to-r from-[#6b2fa5] to-pink-500 origin-left"
          style={{ transform: "scaleX(0)" }}
        />
      </div>

      {/* Tall wrapper */}
      <div ref={wrapperRef} style={{ height: wrapperHeight }}>
        {/* Sticky viewport */}
        <div ref={stickyRef} className="sticky top-0 h-screen w-full overflow-hidden flex items-center">
          {/* Horizontal track */}
          <div
            ref={trackRef}
            className="flex items-center h-full will-change-transform"
            style={{
              width: "max-content",
              paddingLeft: "6vw",
              paddingRight: "6vw",
              gap: "2rem",
            }}
          >
            {/* Organizer label */}
            <div className="flex-shrink-0 flex flex-col justify-center" style={{ width: "160px" }}>
              <div className="inline-flex flex-col items-center gap-3">
                <div className="w-px h-20 bg-gradient-to-b from-transparent to-violet-500" />
                <span
                  className="text-violet-400 text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  Event Organizers
                </span>
                <div className="w-px h-20 bg-gradient-to-t from-transparent to-violet-500" />
              </div>
            </div>

            {organizerSteps.map((step, i) => <StepCard key={`org-${i}`} step={step} />)}

            {/* Divider */}
            <div className="flex-shrink-0 flex flex-col items-center justify-center gap-4 px-2" style={{ width: "90px" }}>
              <div className="w-px h-28 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
              <div className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center">
                <div className="w-2 h-2 bg-white/30 rounded-full" />
              </div>
              <div className="w-px h-28 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            </div>

            {/* Buyer label */}
            <div className="flex-shrink-0 flex flex-col justify-center" style={{ width: "160px" }}>
              <div className="inline-flex flex-col items-center gap-3">
                <div className="w-px h-20 bg-gradient-to-b from-transparent to-blue-500" />
                <span
                  className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  Ticket Buyers
                </span>
                <div className="w-px h-20 bg-gradient-to-t from-transparent to-blue-500" />
              </div>
            </div>

            {buyerSteps.map((step, i) => <StepCard key={`buy-${i}`} step={step} />)}

            {/* End CTA */}
            <div
              className="flex-shrink-0 flex flex-col items-center justify-center text-center bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8"
              style={{ width: "min(300px, 72vw)", minHeight: "340px" }}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#6b2fa5] to-pink-500 flex items-center justify-center mb-5 shadow-xl shadow-purple-500/40">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Ready to Start?</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-[220px] leading-relaxed">
                Join thousands using Spotix to create and attend amazing events
              </p>
              <Link
                href="/home"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6b2fa5] to-purple-600 text-white rounded-full font-semibold text-sm transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/40"
              >
                Get Started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            <div className="flex-shrink-0" style={{ width: "4vw" }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .hiw-header {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .hiw-header.hiw-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  )
}