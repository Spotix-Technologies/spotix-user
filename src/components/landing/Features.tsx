"use client"

import { useEffect, useRef } from "react"
import { Wallet, Users, ShieldCheck, Zap, Star, TrendingUp, ScanLine } from "lucide-react"

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
      className="feat-card group bg-white rounded-2xl p-6 border border-[#ece7f1] hover:border-[#6b2fa5]/30 hover:shadow-lg transition-all duration-300"
      style={{ transitionDelay: `${(index % 4) * 70}ms` }}
    >
      <div className="w-12 h-12 rounded-xl bg-[#f5f0fb] flex items-center justify-center mb-5 transition-colors duration-300 group-hover:bg-[#6b2fa5]">
        <Icon className="w-6 h-6 text-[#6b2fa5] transition-colors duration-300 group-hover:text-white" />
      </div>
      <h3 className="text-lg font-bold text-[#171123] mb-2">{feature.title}</h3>
      <p className="text-[#7c7389] text-sm leading-relaxed">{feature.description}</p>
    </div>
  )
}

export default function Features() {
  const headingRef = useReveal<HTMLDivElement>(0.3)

  return (
    <section id="features" className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#faf9fb]">
      <div className="max-w-7xl mx-auto">
        <div ref={headingRef} className="feat-heading text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f5f0fb] text-[#6b2fa5] text-xs font-bold uppercase tracking-widest rounded-full mb-5">
            Platform Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#171123] mb-4">Why Choose Spotix?</h2>
          <p className="text-lg text-[#7c7389]">
            Everything you need to discover, book, and manage events across Nigeria — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
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
