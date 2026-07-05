"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, PlayCircle, ShieldCheck, Ticket, Users } from "lucide-react"

// Gmail brand mark (not available in lucide-react)
const GmailIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M2 6.9v10.6C2 18.88 3.12 20 4.5 20H6V10.4L2 7.7v-.8Z" fill="#4285F4" />
    <path d="M22 6.9v10.6c0 1.38-1.12 2.5-2.5 2.5H18V10.4l4-2.7v-.8Z" fill="#34A853" />
    <path d="M6 9.7v10.3h12V9.7l-6 4-6-4Z" fill="#FBBC05" />
    <path d="M6 9.7l6 4 6-4V6.9c0-.42-.11-.82-.3-1.16L12 10.4 6.3 5.74A2.47 2.47 0 0 0 6 6.9v2.8Z" fill="#EA4335" />
    <path d="M4.5 4h15c.87 0 1.63.46 2.06 1.16L12 10.4 3.44 5.16A2.47 2.47 0 0 1 4.5 4Z" fill="#EA4335" />
  </svg>
)

const carouselWords = ["Create", "Promote", "Manage", "Sell", "Host"]

// const stats = [
//   { icon: Ticket, label: "Tickets issued", value: "50K+" },
//   { icon: Users, label: "Active organizers", value: "1,200+" },
//   { icon: ShieldCheck, label: "Secure checkouts", value: "100%" },
// ]

const Hero = () => {
  const [wordIndex, setWordIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState("")
  const [isTyping, setIsTyping] = useState(true)
  const heroRef = useRef<HTMLElement>(null)

  // Typewriter cycle through action words
  useEffect(() => {
    const currentWord = carouselWords[wordIndex]
    let timeout: NodeJS.Timeout

    if (isTyping) {
      if (displayedText.length < currentWord.length) {
        timeout = setTimeout(() => setDisplayedText(currentWord.slice(0, displayedText.length + 1)), 90)
      } else {
        timeout = setTimeout(() => setIsTyping(false), 1200)
      }
    } else {
      if (displayedText.length > 0) {
        timeout = setTimeout(() => setDisplayedText(displayedText.slice(0, -1)), 45)
      } else {
        setWordIndex((i) => (i + 1) % carouselWords.length)
        setIsTyping(true)
      }
    }

    return () => clearTimeout(timeout)
  }, [displayedText, isTyping, wordIndex])

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center overflow-hidden pt-28 pb-20"
      style={{ background: "linear-gradient(150deg, #2e1449 0%, #4c2178 45%, #6b2fa5 100%)" }}
    >
      {/* Ambient background texture */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 15% 20%, rgba(224,167,46,0.18) 0%, transparent 60%), radial-gradient(ellipse 55% 55% at 90% 80%, rgba(255,255,255,0.10) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/15 rounded-full mb-8 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e4d6f5]" />
              <span className="text-sm font-medium text-white/85">Polls creation is now publicly available on Spotix</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] mb-6 text-white" style={{ minHeight: "2.3em" }}>
              <span
                className="inline-block text-[#e4d6f5]"
                style={{ minWidth: `${carouselWords[wordIndex].length}ch` }}
              >
                {displayedText}
                <span className="inline-block w-[3px] h-[0.85em] bg-[#e4d6f5] ml-1 align-middle animate-pulse" />
              </span>{" "}
              events with Spotix
            </h1>

            <p className="text-lg sm:text-xl text-white/75 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              The all-in-one platform for finding, booking, and running unforgettable events.
              Spotix is your all inclusive event management engine.
            </p>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4 mb-14">
              <Link
                href="/home"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#6b2fa5] rounded-full text-base font-semibold transition-all duration-300 hover:bg-[#f5f0fb] hover:shadow-lg hover:shadow-black/20"
              >
                Get Started
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/auth/signup"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/25 text-white rounded-full text-base font-semibold transition-all duration-300 hover:bg-white/15"
              >
                <PlayCircle className="w-4 h-4" />
                Create Events
              </Link>
            </div>

            {/* Stats row */}
            {/* <div className="grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
              {stats.map(({ icon: Icon, label, value }) => (
                <div key={label} className="text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start gap-1.5 text-white mb-1">
                    <Icon className="w-4 h-4 text-[#e4d6f5]" />
                    <span className="text-xl sm:text-2xl font-bold">{value}</span>
                  </div>
                  <p className="text-xs text-white/55">{label}</p>
                </div>
              ))}
            </div> */}
          </div>

          {/* Visual */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-6 rounded-[2rem] bg-white/10 blur-3xl pointer-events-none" />
            <div className="relative rounded-[1.75rem] overflow-hidden border border-white/15 shadow-2xl aspect-[4/5]">
              <Image
                src="/hero.jpg"
                alt="People enjoying a live event"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 480px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2e1449]/70 via-transparent to-transparent" />

              {/* Floating ticket card */}
              <div className="absolute bottom-5 left-5 right-5 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl flex items-center gap-3">
                <div className="w-11 h-11 flex items-center justify-center flex-shrink-0">
                  <GmailIcon className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#171123] truncate">Spotix Tickets</p>
                  <p className="text-xs text-[#7c7389]">Sent instantly to your email</p>
                </div>
              </div>
            </div>

            {/* Decorative ring */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full border border-white/15 hidden sm:block pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </section>
  )
}

export default Hero