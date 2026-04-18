"use client"

import { useState, useRef, useEffect } from "react"
import { Mail, Sparkles, Check } from "lucide-react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const Newsletter = () => {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState("")
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number }>>([])
  const buttonRef = useRef<HTMLButtonElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const subTextRef = useRef<HTMLParagraphElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const trustRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const els = [headingRef.current, subTextRef.current, formRef.current, trustRef.current].filter(Boolean)

      gsap.fromTo(els,
        { opacity: 0, y: 50, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.12, ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%", toggleActions: "play none none none" } }
      )

      // Floating background orbs
      const orbs = sectionRef.current?.querySelectorAll(".bg-orb")
      if (orbs) {
        orbs.forEach((orb, i) => {
          gsap.to(orb, {
            y: i % 2 === 0 ? -30 : 30,
            x: i % 2 === 0 ? 20 : -20,
            duration: 4 + i,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          })
        })
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const createConfetti = () => {
    const colors = ["#6b2fa5", "#a855f7", "#ec4899", "#f97316", "#fbbf24", "#34d399"]
    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 200 - 100,
      y: Math.random() * -150 - 50,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.1,
    }))
    setConfetti(particles)
    setTimeout(() => setConfetti([]), 1500)
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email.trim()) { setError("Please enter your email address"); return }
    if (!validateEmail(email)) { setError("Please enter a valid email address"); return }
    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "newsletter"), { email: email.toLowerCase().trim(), timestamp: serverTimestamp(), subscribed: true })
      createConfetti()
      setIsSubscribed(true)
      setEmail("")
    } catch {
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <section
      ref={sectionRef}
      className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-[#6b2fa5] via-purple-700 to-purple-900"
    >
      {/* Animated background orbs */}
      <div className="bg-orb absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="bg-orb absolute bottom-0 right-0 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl pointer-events-none" />
      <div className="bg-orb absolute top-1/3 right-1/4 w-64 h-64 bg-yellow-300/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="max-w-4xl mx-auto relative z-10 text-center">
        {/* Heading */}
        <h2 ref={headingRef} className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          We are always{" "}
          <span className="relative inline-block">
            <span className="relative z-10 bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent">cooking!</span>
            <div className="absolute bottom-2 left-0 right-0 h-3 bg-yellow-300/30 -rotate-1" />
          </span>
          {" "}🔥
        </h2>

        {/* Body */}
        <p ref={subTextRef} className="text-lg sm:text-xl text-purple-100 mb-10 max-w-2xl mx-auto leading-relaxed">
          Subscribe to Spotix Newsletter. We would only send you the best events happening as well as our latest
          developments. <span className="font-bold text-white">No spam!</span>
        </p>

        {/* Form / Success */}
        {!isSubscribed ? (
          <form ref={formRef} onSubmit={handleSubscribe} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-full text-white placeholder-purple-200 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300"
                  disabled={isSubmitting}
                />
              </div>

              <div className="relative">
                <button
                  ref={buttonRef}
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative px-8 py-4 bg-white text-[#6b2fa5] rounded-full font-bold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed overflow-visible w-full sm:w-auto"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <><div className="w-5 h-5 border-2 border-[#6b2fa5] border-t-transparent rounded-full animate-spin" />Subscribing...</>
                    ) : (
                      <><Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />Subscribe</>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-pink-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                </button>

                {confetti.map((p) => (
                  <div key={p.id} className="absolute top-1/2 left-1/2 w-3 h-3 pointer-events-none"
                    style={{ backgroundColor: p.color, animation: "confetti 1s ease-out forwards", animationDelay: `${p.delay}s`, "--x": `${p.x}px`, "--y": `${p.y}px`, borderRadius: Math.random() > 0.5 ? "50%" : "2px", transform: `translate(-50%, -50%) rotate(${Math.random() * 360}deg)` } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>

            {error && <p className="mt-4 text-red-300 text-sm font-medium animate-shake">{error}</p>}
          </form>
        ) : (
          <div className="max-w-md mx-auto animate-fade-in">
            <div className="bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-3xl p-8">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-in">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Thank You! 🎉</h3>
              <p className="text-purple-100 mb-6">You're now subscribed to Spotix Newsletter. Get ready for amazing events and updates!</p>
              <button onClick={() => { setIsSubscribed(false); setIsSubmitting(false) }} className="text-white/80 hover:text-white text-sm underline transition-colors">
                Subscribe another email
              </button>
            </div>
          </div>
        )}

        {/* Trust indicators */}
        <div ref={trustRef} className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-purple-200">
          {[{ label: "Secure & Private", delay: "0s" }, { label: "Unsubscribe Anytime", delay: "0.5s" }, { label: "No Spam, Ever", delay: "1s" }].map(({ label, delay }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: delay }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% { transform: translate(-50%, -50%) translateY(0) translateX(0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) translateY(var(--y)) translateX(var(--x)) rotate(720deg) scale(0); opacity: 0; }
        }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes bounce-in { 0% { transform: scale(0); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-fade-in { animation: fade-in 0.5s ease-out; }
        .animate-bounce-in { animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
      `}</style>
    </section>
  )
}

export default Newsletter
