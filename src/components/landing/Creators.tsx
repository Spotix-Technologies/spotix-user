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
      const headerEls = headerRef.current?.querySelectorAll(".header-el")
      if (headerEls) {
        gsap.fromTo(
          headerEls,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: { trigger: headerRef.current, start: "top 80%", toggleActions: "play none none none" },
          }
        )
      }

      cardRefs.current.forEach((card, i) => {
        if (!card) return
        const fromX = i === 0 ? -60 : 60
        gsap.fromTo(
          card,
          { opacity: 0, x: fromX },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            ease: "power3.out",
            delay: i * 0.1,
            scrollTrigger: { trigger: card, start: "top 80%", toggleActions: "play none none none" },
          }
        )

        const img = card.querySelector("img")
        if (img) {
          card.addEventListener("mouseenter", () => gsap.to(img, { scale: 1.06, duration: 0.5, ease: "power2.out" }))
          card.addEventListener("mouseleave", () => gsap.to(img, { scale: 1, duration: 0.5, ease: "power2.inOut" }))
        }
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="creators" className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <div ref={headerRef} className="text-center mb-16">
          <span className="header-el inline-flex items-center gap-2 px-3 py-1.5 bg-[#f5f0fb] text-[#6b2fa5] text-xs font-bold uppercase tracking-widest rounded-full mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            The Visionaries
          </span>
          <h2 className="header-el text-3xl sm:text-4xl lg:text-5xl font-bold text-[#171123] mb-4">Meet The Founders</h2>
          <p className="header-el text-lg text-[#7c7389] max-w-xl mx-auto">
            The passionate minds behind Spotix, dedicated to revolutionizing the event experience.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {creators.map((creator, index) => (
            <div
              key={index}
              ref={(el) => {
                cardRefs.current[index] = el
              }}
              className="group relative bg-white rounded-2xl border border-[#ece7f1] hover:border-[#6b2fa5]/25 hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="h-1.5 w-full bg-[#6b2fa5]" />

              <div className="flex flex-col items-center text-center px-6 pt-8 pb-7">
                <div className="relative mb-5">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-[#f5f0fb]">
                    <Image src={creator.image} alt={creator.name} fill className="object-cover" sizes="128px" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-[#6b2fa5] text-white text-xs font-bold rounded-full whitespace-nowrap">
                    {creator.title}
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[#171123] mt-3 mb-5">{creator.name}</h3>

                <div className="flex items-center gap-3">
                  {[
                    { href: creator.social.linkedin, label: "LinkedIn", Icon: Linkedin },
                    { href: creator.social.twitter, label: "Twitter", Icon: Twitter },
                    { href: `mailto:${creator.social.email}`, label: "Email", Icon: Mail },
                  ].map(({ href, label, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      className="w-10 h-10 rounded-full bg-[#f5f0fb] hover:bg-[#6b2fa5] text-[#6b2fa5] hover:text-white flex items-center justify-center transition-colors duration-300"
                      aria-label={label}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
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
