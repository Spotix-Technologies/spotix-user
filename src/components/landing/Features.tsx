"use client"

import { useEffect, useRef } from "react"
import { Wallet, Users, ShieldCheck, Zap, Star, TrendingUp, ScanLine } from "lucide-react"
import { UI } from "./theme"

const features = [
  { icon: Wallet, title: "Secure Payments", description: "Fast and reliable transactions with industry-leading encryption and payment protection. Every naira is secured." },
  { icon: Users, title: "Community Driven", description: "Connect with like-minded event-goers and build lasting memories together. Find your tribe at every event." },
  { icon: ShieldCheck, title: "Safe & Verified", description: "All events are verified for authenticity. Your safety is our top priority, from purchase to entry." },
  { icon: Zap, title: "Instant Booking", description: "Book tickets in seconds with our lightning-fast checkout process. No waiting, no friction." },
  { icon: Star, title: "Premium Experience", description: "Enjoy VIP treatment with exclusive perks and early access to the hottest events before anyone else." },
  { icon: TrendingUp, title: "Trending Events", description: "Stay ahead of the curve with real-time insights on the hottest upcoming events in your city." },
  { icon: ScanLine, title: "Offline Ticket Scanning", description: "Scan tickets offline with our built-in QR scanner. Works without internet — perfect for venues with poor connectivity." },
]

function useReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("feat-visible")
          obs.disconnect()
        }
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return ref
}

function FeatureCard({ feature, index }: { feature: (typeof features)[number]; index: number }) {
  const ref = useReveal<HTMLDivElement>()
  const Icon = feature.icon
  return (
    <div
      ref={ref}
      className="feat-card group flex items-start gap-5 border-t border-[#e8e4ee] py-6 first:border-t-0 first:pt-0"
      style={{ transitionDelay: `${(index % 3) * 70}ms` }}
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#f7f6f9] transition-colors duration-300 group-hover:bg-[#171123]">
        <Icon className="h-5 w-5 text-[#6b2fa5] transition-colors duration-300 group-hover:text-white" />
      </div>
      <div className="min-w-0">
        <h3 className="mb-1 text-lg font-bold text-[#171123]">{feature.title}</h3>
        <p className="text-sm leading-relaxed text-[#6b6478] sm:text-base">{feature.description}</p>
      </div>
    </div>
  )
}

export default function Features() {
  const headingRef = useReveal<HTMLDivElement>(0.3)

  return (
    <section id="features" className={`scroll-mt-20 py-20 sm:py-24 ${UI.bandWhite}`}>
      <div className={`${UI.container} grid gap-12 lg:grid-cols-[5fr_7fr] lg:gap-20`}>
        <div ref={headingRef} className="feat-heading lg:sticky lg:top-32 lg:self-start">
          <p className={`${UI.eyebrow} mb-3`}>Platform features</p>
          <h2 className={`${UI.h2} mb-5`}>Why choose Spotix?</h2>
          {/* <p className={UI.lead}>
            Everything you need to discover, book, and manage events across Nigeria — all in one place.
          </p> */}
        </div>

        <div>
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>

      <style jsx>{`
        .feat-heading {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .feat-heading.feat-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .feat-card {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.55s ease, transform 0.55s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .feat-card.feat-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  )
}
