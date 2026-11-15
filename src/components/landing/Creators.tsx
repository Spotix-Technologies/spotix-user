"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { Linkedin, Twitter, Mail } from "lucide-react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { UI } from "./theme"

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
        // Vertical reveal only — sideways offsets pushed the page wider than the viewport
        gsap.fromTo(
          card,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
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
    <section ref={sectionRef} id="creators" className={`relative overflow-x-clip py-20 sm:py-24 ${UI.bandGrey}`}>
      <div className={UI.container}>
        <div ref={headerRef} className="text-center mb-14">
          <p className={`header-el ${UI.eyebrow} mb-3`}>The visionaries</p>
          <h2 className={`header-el ${UI.h2} mb-4`}>Meet the founders</h2>
          <p className={`header-el ${UI.lead} max-w-xl mx-auto`}>
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
              className="group relative overflow-hidden rounded-2xl border border-[#ece7f1] bg-white transition-all duration-300 hover:border-[#171123]/25"
            >
              <div className="flex flex-col items-center text-center px-6 pt-8 pb-7">
                <div className="relative mb-5">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-[#f5f0fb]">
                    <Image src={creator.image} alt={creator.name} fill className="object-cover" sizes="128px" />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-[#171123] text-white text-xs font-bold rounded-full whitespace-nowrap">
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
                      className="w-10 h-10 rounded-full bg-[#f7f6f9] hover:bg-[#171123] text-[#4b4257] hover:text-white flex items-center justify-center transition-colors duration-200"
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
