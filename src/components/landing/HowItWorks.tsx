"use client"

import { useEffect, useRef } from "react"
import { CheckCircle, PlusCircle, Share2, BarChart2, Ticket, Search, CreditCard,/* Sparkles */ ArrowRight } from "lucide-react"
import Link from "next/link"

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
      className="hiw-reveal flex items-start gap-4 p-5 rounded-2xl border bg-white border-[#ece7f1] hover:border-[#6b2fa5]/30 hover:shadow-md transition-colors duration-300"
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-[#f5f0fb] text-[#6b2fa5]">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-[#c9aee5]">{step.number}</span>
          <h4 className="font-bold text-[#171123]">{step.title}</h4>
        </div>
        <p className="text-sm leading-relaxed text-[#7c7389]">{step.description}</p>
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
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4 bg-[#f5f0fb] text-[#6b2fa5]">
          {badge}
        </span>
        <h3 className="text-2xl sm:text-3xl font-bold text-[#171123]">{title}</h3>
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
    <section id="how-it-works" className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <div className="relative max-w-6xl mx-auto">
        <div ref={headerRef} className="hiw-reveal text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#f5f0fb] border border-[#e4d6f5] rounded-full mb-6">
            {/* <Sparkles className="w-4 h-4 text-[#6b2fa5]" />
            <span className="text-sm font-semibold text-[#4b4257]">Step by step</span> */}
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#171123] mb-4">How It Works</h2>
          <p className="text-lg text-[#7c7389] max-w-xl mx-auto">
            A simple path for organizers and ticket buyers alike.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          <StepColumn title="For Event Organizers" badge="Organizers" steps={organizerSteps} />
          <StepColumn title="For Ticket Buyers" badge="Buyers" steps={buyerSteps} />
        </div>

        <div className="mt-16 flex flex-col items-center text-center bg-[#f5f0fb] border border-[#e4d6f5] rounded-3xl p-10">
          <div className="w-14 h-14 rounded-full bg-[#6b2fa5] flex items-center justify-center mb-5">
            {/* <Sparkles className="w-7 h-7 text-white" /> */}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#171123] mb-2">Ready to start?</h3>
          <p className="text-[#7c7389] text-sm sm:text-base mb-6 max-w-md">
            Join thousands using Spotix to create and attend amazing events.
          </p>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#6b2fa5] text-white rounded-full font-semibold text-sm transition-all duration-300 hover:bg-[#4c2178]"
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
