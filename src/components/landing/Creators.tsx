"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { Linkedin, Twitter, Mail, Sparkles } from "lucide-react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const creators = [
  {
    name: "Ezene Chidebere Bryan",
    title: "CEO / Founder",
    image: "/bryan.png",
    social: { linkedin: "#", twitter: "#", email: "bryan@spotix.com" },
  },
  {
    name: "Onyekwelu Michael (Drexx)",
    title: "Co-Founder / Snr Engineer",
    image: "/drexx.png",
    social: { linkedin: "#", twitter: "#", email: "drexx@spotix.com" },
  },
]

const Creators = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Header
      const headerEls = headerRef.current?.querySelectorAll(".header-el")
      if (headerEls) {
        gsap.fromTo(headerEls,
          { opacity: 0, y: 40, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.15, ease: "power3.out",
            scrollTrigger: { trigger: headerRef.current, start: "top 80%", toggleActions: "play none none none" } }
        )
      }

      // Cards
      cardRefs.current.forEach((card, i) => {
        if (!card) return
        const fromX = i === 0 ? -80 : 80
        gsap.fromTo(card,
          { opacity: 0, x: fromX, y: 40, scale: 0.92 },
          { opacity: 1, x: 0, y: 0, scale: 1, duration: 1, ease: "power3.out", delay: i * 0.15,
            scrollTrigger: { trigger: card, start: "top 80%", toggleActions: "play none none none" } }
        )

        // Image scale on hover — GSAP handles this via mouse events
        const img = card.querySelector("img")
        const ring = card.querySelector(".hover-ring")
        if (img) {
          card.addEventListener("mouseenter", () => {
            gsap.to(img, { scale: 1.1, duration: 0.6, ease: "power2.out" })
            if (ring) gsap.to(ring, { opacity: 1, scale: 1.05, duration: 0.4, ease: "power2.out" })
          })
          card.addEventListener("mouseleave", () => {
            gsap.to(img, { scale: 1, duration: 0.5, ease: "power2.inOut" })
            if (ring) gsap.to(ring, { opacity: 0, scale: 1, duration: 0.4, ease: "power2.inOut" })
          })
        }
      })

    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="creators" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
      <div className="absolute top-20 left-0 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div ref={headerRef} className="text-center mb-20">
          <div className="header-el inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-semibold text-purple-600">The Visionaries</span>
          </div>
          <h2 className="header-el text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-[#6b2fa5] via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Meet The Founders
          </h2>
          <p className="header-el text-xl text-gray-600 max-w-2xl mx-auto">
            The passionate minds behind Spotix, dedicated to revolutionizing the event experience
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {creators.map((creator, index) => (
            <div
              key={index}
              ref={(el) => { cardRefs.current[index] = el }}
              className="group relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-shadow duration-500 overflow-hidden border border-purple-100 cursor-default"
            >
              {/* Gradient glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-[#6b2fa5] to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl pointer-events-none" />

              <div className="relative bg-white rounded-3xl p-8">
                {/* Top bar */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#6b2fa5] to-purple-600 rounded-t-3xl" />

                <div className="flex flex-col items-center text-center pt-4">
                  {/* Image */}
                  <div className="relative mb-6">
                    {/* Animated ring */}
                    <div className="hover-ring absolute inset-0 -m-2 rounded-full bg-gradient-to-r from-[#6b2fa5] to-purple-600 opacity-0 animate-pulse pointer-events-none" style={{ animationDuration: "2s" }} />

                    <div className="relative p-1 rounded-full bg-gradient-to-r from-[#6b2fa5] to-purple-600">
                      <div className="relative w-48 h-48 rounded-full overflow-hidden bg-white p-1">
                        <div className="relative w-full h-full rounded-full overflow-hidden">
                          <Image src={creator.image} alt={creator.name} fill className="object-cover" sizes="192px" />
                        </div>
                      </div>
                    </div>

                    {/* Role badge */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-[#6b2fa5] to-purple-600 text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap group-hover:scale-110 transition-transform duration-500">
                      {creator.title}
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-800 group-hover:text-[#6b2fa5] transition-colors duration-300 mb-6">
                    {creator.name}
                  </h3>

                  {/* Social Links */}
                  <div className="flex items-center gap-4">
                    {[
                      { href: creator.social.linkedin, label: "LinkedIn", Icon: Linkedin },
                      { href: creator.social.twitter, label: "Twitter", Icon: Twitter },
                      { href: `mailto:${creator.social.email}`, label: "Email", Icon: Mail },
                    ].map(({ href, label, Icon }) => (
                      <a key={label} href={href}
                        className="p-3 rounded-full bg-purple-50 hover:bg-gradient-to-r hover:from-[#6b2fa5] hover:to-purple-600 text-gray-600 hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-lg"
                        aria-label={label}
                      >
                        <Icon className="w-5 h-5" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Creators
