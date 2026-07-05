"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("cta-visible")
          obs.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

export default function CTA() {
  const ref = useReveal<HTMLDivElement>()

  return (
    <section className="relative py-24 sm:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white">
      <div ref={ref} className="cta-reveal relative max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f5f0fb] border border-[#e4d6f5] rounded-full mb-8">
          <Sparkles className="w-4 h-4 text-[#6b2fa5]" />
          <span className="text-sm font-semibold text-[#4b4257]">As it should be</span>
        </div>

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#171123] mb-6 leading-[1.1]">
          Your events deserve <span className="text-[#6b2fa5]">the spotlight</span>
        </h2>

        <p className="text-lg text-[#7c7389] mb-10 max-w-xl mx-auto">
          Join organizers and attendees already using Spotix to make events unforgettable.
        </p>

        <Link
          href="/home"
          className="group inline-flex items-center gap-2 px-9 py-4 bg-[#6b2fa5] text-white rounded-full font-bold text-base transition-all duration-300 hover:bg-[#4c2178]"
        >
          Explore Events
          <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>

        {/* <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[#7c7389] text-sm">
          <span>Free to join</span>
          <span className="w-1 h-1 bg-[#e4d6f5] rounded-full" />
          <span>No hidden fees</span>
          <span className="w-1 h-1 bg-[#e4d6f5] rounded-full" />
          <span>Instant access</span>
        </div> */}
      </div>

      <style jsx>{`
        .cta-reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .cta-reveal.cta-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  )
}
