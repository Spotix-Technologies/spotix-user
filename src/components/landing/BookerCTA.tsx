"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Calendar, DollarSign, BarChart, ArrowRight, Zap } from "lucide-react"
import { UI } from "./theme"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const bookerFeatures = [
  { icon: Calendar, title: "Create Events", description: "Easily create and manage your events with our intuitive dashboard." },
  { icon: DollarSign, title: "Sell Tickets", description: "Set up ticket types, prices, and manage sales all in one place." },
  { icon: BarChart, title: "Track Analytics", description: "Get detailed insights on ticket sales, attendee demographics, and more." },
]

const BookerCTA = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<(HTMLDivElement | null)[]>([])
  const badgeRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const ctaBtnsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        badgeRef.current,
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", scrollTrigger: { trigger: sectionRef.current, start: "top 75%", toggleActions: "play none none none" } }
      )

      gsap.fromTo(
        headingRef.current,
        { opacity: 0, x: -40 },
        { opacity: 1, x: 0, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: headingRef.current, start: "top 80%", toggleActions: "play none none none" } }
      )

      featuresRef.current.forEach((el, i) => {
        if (!el) return
        gsap.fromTo(
          el,
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, duration: 0.6, ease: "power3.out", delay: i * 0.1, scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" } }
        )
      })

      gsap.fromTo(
        ctaBtnsRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", scrollTrigger: { trigger: ctaBtnsRef.current, start: "top 90%", toggleActions: "play none none none" } }
      )

      gsap.fromTo(
        imageRef.current,
        { opacity: 0, x: 50 },
        { opacity: 1, x: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: imageRef.current, start: "top 75%", toggleActions: "play none none none" } }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={`relative overflow-hidden py-20 sm:py-24 ${UI.bandWhite}`}
    >
      <div className={`${UI.container} relative z-10`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content Side */}
          <div ref={contentRef} className="space-y-8">
            <div ref={badgeRef} className={UI.pill}>
              <span className="w-2 h-2 bg-[#6b2fa5] rounded-full" />
              For Event Organizers
            </div>

            <div ref={headingRef} className="space-y-4">
              <h2 className={UI.h2}>
                Become a <span className="text-[#6b2fa5]">Booker</span>
              </h2>
              <p className={UI.lead}>
                Are you an event organizer? Join Spotix as a booker and start creating and managing your own events.
              </p>
            </div>

            <div className="space-y-4">
              {bookerFeatures.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <div
                    key={index}
                    ref={(el) => {
                      featuresRef.current[index] = el
                    }}
                    className={`group flex items-start gap-4 p-5 transition-colors duration-300 hover:border-[#171123]/25 ${UI.card}`}
                  >
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#f7f6f9] flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-[#6b2fa5]" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-base font-bold text-[#171123]">{feature.title}</h3>
                      <p className="text-[#7c7389] text-sm leading-relaxed">{feature.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-[#171123] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-shrink-0" />
                  </div>
                )
              })}
            </div>

            <div ref={ctaBtnsRef} className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link
                href="https://booker.spotix.com.ng/create-event"
                className={UI.btnPrimary}
              >
                Create Event
                <Calendar className="w-4 h-4" />
              </Link>
              <Link
                href="/booker-confirm"
                className={UI.btnOutline}
              >
                Become a Booker
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Image Side */}
          <div ref={imageRef} className="relative">
            <div className="relative overflow-hidden rounded-3xl bg-[#f7f6f9] p-6 sm:p-10">
              <div className="relative w-full" style={{ aspectRatio: "1/1" }}>
                <Image src="/BK.png" alt="Spotix Booker Dashboard" fill className="object-contain" sizes="(max-width: 640px) 100vw, 50vw" priority />
              </div>
            </div>

            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
              <div className="px-5 py-2.5 bg-white rounded-full shadow-[0_8px_24px_-8px_rgba(23,17,35,0.25)] flex items-center gap-2 border border-[#ece7f1]">
                <Zap className="w-4 h-4 text-[#6b2fa5]" />
                <span className="font-bold text-[#171123] text-sm">All Devices</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default BookerCTA
