"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Calendar, DollarSign, BarChart, ArrowRight, Zap } from "lucide-react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const BookerCTA = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<(HTMLDivElement | null)[]>([])
  const badgeRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)
  const ctaBtnsRef = useRef<HTMLDivElement>(null)

  const bookerFeatures = [
    { icon: Calendar, title: "Create Events", description: "Easily create and manage your events with our intuitive dashboard.", color: "from-blue-400 to-cyan-500" },
    { icon: DollarSign, title: "Sell Tickets", description: "Set up ticket types, prices, and manage sales all in one place.", color: "from-green-400 to-emerald-500" },
    { icon: BarChart, title: "Track Analytics", description: "Get detailed insights on ticket sales, attendee demographics, and more.", color: "from-purple-400 to-pink-500" },
  ]

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Badge
      gsap.fromTo(badgeRef.current,
        { opacity: 0, y: -20, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.7)",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%", toggleActions: "play none none none" } }
      )

      // Heading
      gsap.fromTo(headingRef.current,
        { opacity: 0, x: -60 },
        { opacity: 1, x: 0, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: headingRef.current, start: "top 80%", toggleActions: "play none none none" } }
      )

      // Feature rows stagger
      featuresRef.current.forEach((el, i) => {
        if (!el) return
        gsap.fromTo(el,
          { opacity: 0, x: -50, scale: 0.95 },
          { opacity: 1, x: 0, scale: 1, duration: 0.7, ease: "power3.out", delay: i * 0.12,
            scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" } }
        )
      })

      // CTA buttons
      gsap.fromTo(ctaBtnsRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out",
          scrollTrigger: { trigger: ctaBtnsRef.current, start: "top 90%", toggleActions: "play none none none" } }
      )

      // Image panel
      gsap.fromTo(imageRef.current,
        { opacity: 0, x: 80, scale: 0.93, rotateY: 10 },
        { opacity: 1, x: 0, scale: 1, rotateY: 0, duration: 1.1, ease: "power3.out",
          scrollTrigger: { trigger: imageRef.current, start: "top 75%", toggleActions: "play none none none" } }
      )

      // Subtle float on image
      gsap.to(imageRef.current, {
        y: -12,
        duration: 3,
        ease: "power1.inOut",
        yoyo: true,
        repeat: -1,
      })

    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-900 via-[#6b2fa5] to-purple-800 overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-300 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "5s", animationDelay: "1s" }} />
      </div>
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "50px 50px" }} />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content Side */}
          <div ref={contentRef} className="space-y-8">
            {/* Badge */}
            <div ref={badgeRef} className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-white">For Event Organizers</span>
            </div>

            {/* Heading */}
            <div ref={headingRef} className="space-y-4">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Become a{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent">Booker</span>
                  <div className="absolute bottom-2 left-0 right-0 h-3 bg-yellow-300/30 -rotate-1" />
                </span>
              </h2>
              <p className="text-xl text-purple-100">
                Are you an event organizer? Join Spotix as a booker and start creating and managing your own events.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {bookerFeatures.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <div
                    key={index}
                    ref={(el) => { featuresRef.current[index] = el }}
                    className="group flex items-start gap-4 p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all duration-300 hover:scale-[1.02] cursor-default"
                  >
                    <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-0.5 transition-all duration-300 group-hover:rotate-6 group-hover:scale-110`}>
                      <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-[#6b2fa5]" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-lg font-bold text-white group-hover:text-yellow-300 transition-colors">{feature.title}</h3>
                      <p className="text-purple-100 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-3 transition-all duration-300" />
                  </div>
                )
              })}
            </div>

            {/* CTA Buttons */}
            <div ref={ctaBtnsRef} className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="https://booker.spotix.com.ng/create-event" className="group relative px-8 py-4 bg-white text-[#6b2fa5] rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Create Event
                  <Calendar className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-pink-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <Link href="/booker-confirm" className="group px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-full font-bold text-lg transition-all duration-300 hover:bg-white hover:text-[#6b2fa5] hover:scale-105 hover:shadow-xl">
                <span className="flex items-center justify-center gap-2">
                  Become a Booker
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </div>
          </div>

          {/* Image Side */}
          <div ref={imageRef} className="relative" style={{ perspective: "1000px" }}>
            {/* Glows */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-yellow-300/20 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: "3s" }} />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-pink-300/20 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: "4s", animationDelay: "1s" }} />

            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-br from-yellow-300 via-pink-300 to-purple-300 rounded-3xl blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 pointer-events-none" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl transform transition-all duration-700 group-hover:scale-[1.02] group-hover:-rotate-1">
                <div className="relative w-full" style={{ aspectRatio: "1/1" }}>
                  <Image src="/BK.png" alt="Spotix Booker Dashboard" fill className="object-contain transition-transform duration-700" sizes="(max-width: 640px) 100vw, 50vw" priority />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#6b2fa5]/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
              </div>

              {/* Badges */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-10">
                <div className="px-6 py-3 bg-white rounded-full shadow-2xl flex items-center gap-2 group-hover:scale-110 transition-transform duration-300">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span className="font-bold text-gray-800">All Devices</span>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 px-4 py-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-xl flex items-center gap-2 group-hover:scale-110 transition-transform duration-300">
                <div className="flex -space-x-2">
                  {["💻", "📱", "🔳"].map((emoji, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-white border-2 border-green-400 flex items-center justify-center"><span className="text-xs">{emoji}</span></div>
                  ))}
                </div>
                <span className="text-white font-bold text-sm whitespace-nowrap">Responsive</span>
              </div>
            </div>

            {/* Spinning rings */}
            <div className="absolute top-1/4 -left-8 w-16 h-16 border-4 border-yellow-300/30 rounded-full animate-spin pointer-events-none" style={{ animationDuration: "20s" }} />
            <div className="absolute bottom-1/4 -right-8 w-12 h-12 border-4 border-pink-300/30 rounded-full animate-spin pointer-events-none" style={{ animationDuration: "15s", animationDirection: "reverse" }} />
          </div>
        </div>
      </div>
    </section>
  )
}

export default BookerCTA
