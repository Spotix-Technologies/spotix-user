"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { UI } from "./theme"

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
    <section className={`relative overflow-hidden px-4 py-24 sm:px-6 sm:py-28 lg:px-8 ${UI.bandWhite}`}>
      <div
        ref={ref}
        className="cta-reveal relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#171123] px-6 py-16 text-center sm:px-12 sm:py-20"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundImage: "radial-gradient(ellipse 70% 80% at 50% 0%, rgba(107,47,165,0.55) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <h2 className="mx-auto mb-5 max-w-2xl text-4xl font-bold leading-[1.08] tracking-tight text-white text-balance sm:text-5xl lg:text-6xl">
            Your events deserve the spotlight
          </h2>

          <p className="mx-auto mb-10 max-w-xl text-lg text-white/70">
            Join organizers and attendees already using Spotix to make events unforgettable.
          </p>

          <Link
            href="/home"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-9 py-4 text-base font-semibold text-[#171123] transition-colors duration-200 hover:bg-[#f0eaf8]"
          >
            Explore Events
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>

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
