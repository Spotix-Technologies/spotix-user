"use client"

import { useEffect, useRef } from "react"
import { CheckCircle, PlusCircle, Share2, BarChart2, Ticket, Search, CreditCard, ArrowRight } from "lucide-react"
import Link from "next/link"
import { UI } from "./theme"

const organizerSteps = [
  { icon: CheckCircle, number: "01", title: "Sign up as a Booker", description: "Create your organizer account and verify your identity to unlock the full event management dashboard." },
  { icon: PlusCircle, number: "02", title: "Create your event", description: "Add event details, venue, dates, and ticket tiers. Upload a cover image and set prices in minutes." },
  { icon: Share2, number: "03", title: "Share event links", description: "Get a unique shareable link. Post across socials or WhatsApp and watch registrations come in live." },
  { icon: BarChart2, number: "04", title: "Monitor your stats", description: "Track sales and attendee data from your dashboard, and scan tickets offline at the gate." },
]

const buyerSteps = [
  { icon: Search, number: "01", title: "Discover events", description: "Browse featured and themed events. Filter by date, type, or city to find exactly what fits." },
  { icon: CreditCard, number: "02", title: "Book instantly", description: "Select your ticket type and pay securely with Paystack. Your ticket is generated instantly." },
  { icon: Ticket, number: "03", title: "Attend & enjoy", description: "Present your QR ticket at the gate either online or offline and get scanned in seconds." },
]

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("hiw-visible")
          obs.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

function StepCard({ step, index }: { step: (typeof organizerSteps)[number]; index: number }) {
  const ref = useReveal<HTMLDivElement>()
  const Icon = step.icon
  return (
    <div
      ref={ref}
      className={`hiw-reveal flex items-start gap-4 p-5 transition-colors duration-300 hover:border-[#171123]/25 ${UI.card}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-[#f5f0fb] text-[#6b2fa5]">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#6b2fa5]">Step {step.number}</p>
        <h4 className="mb-1 text-lg font-bold text-[#171123]">{step.title}</h4>
        <p className="text-sm leading-relaxed text-[#6b6478]">{step.description}</p>
      </div>
    </div>
  )
}

function StepColumn({
  title,
  badge,
  steps,
}: {
  title: string
  badge: string
  steps: typeof organizerSteps
}) {
  const headerRef = useReveal<HTMLDivElement>()

  return (
    <div>
      <div ref={headerRef} className="hiw-reveal mb-8">
        <p className={`${UI.eyebrow} mb-3`}>{badge}</p>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#171123]">{title}</h3>
      </div>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <StepCard key={step.number} step={step} index={i} />
        ))}
      </div>
    </div>
  )
}

export default function HowItWorks() {
  const headerRef = useReveal<HTMLDivElement>()

  return (
    <section id="how-it-works" className={`relative scroll-mt-20 overflow-hidden py-20 sm:py-24 ${UI.bandGrey}`}>
      <div className={`${UI.container} relative`}>
        <div ref={headerRef} className="hiw-reveal mb-14 max-w-2xl">
          <p className={`${UI.eyebrow} mb-3`}>How it works</p>
          <h2 className={`${UI.h2} mb-4`}>A simple path for organizers and ticket buyers</h2>
          <p className={UI.lead}>Four steps to launch an event. Three to get your ticket.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          <StepColumn title="For Event Organizers" badge="Organizers" steps={organizerSteps} />
          <StepColumn title="For Ticket Buyers" badge="Buyers" steps={buyerSteps} />
        </div>

        <div className="mt-16 flex flex-col items-center rounded-3xl bg-[#171123] p-10 text-center sm:p-14">
          <h3 className="mb-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Ready to start?</h3>
          <p className="mb-7 max-w-md text-sm text-white/70 sm:text-base">
            Join thousands using Spotix to create and attend amazing events.
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#171123] transition-colors duration-200 hover:bg-[#f0eaf8]"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <style jsx>{`
        .hiw-reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .hiw-reveal.hiw-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </section>
  )
}
