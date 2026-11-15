"use client"

import { useState, useRef, useEffect } from "react"
import { Mail, Sparkles, Check } from "lucide-react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { UI } from "./theme"

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger)
}

const Newsletter = () => {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState("")
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const subTextRef = useRef<HTMLParagraphElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const trustRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const els = [headingRef.current, subTextRef.current, formRef.current, trustRef.current].filter(Boolean)
      gsap.fromTo(
        els,
        { opacity: 0, y: 32 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%", toggleActions: "play none none none" },
        }
      )
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }
    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "newsletter"), { email: email.toLowerCase().trim(), timestamp: serverTimestamp(), subscribed: true })
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
      className={`relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 ${UI.bandGrey}`}
    >
      <div className="max-w-3xl mx-auto relative z-10 text-center">
        {/* <div className={`${UI.pill} mb-6`}>
          <Sparkles className="w-4 h-4 text-[#6b2fa5]" />
          Stay in the loop
        </div> */}

        <h2 ref={headingRef} className={`${UI.h2} mb-5`}>
          We are always cooking
        </h2>

        <p ref={subTextRef} className={`${UI.lead} mb-10 max-w-xl mx-auto`}>
          Subscribe to the Spotix newsletter for the best events happening and our latest updates.{" "}
          <span className="font-semibold text-[#171123]">No spam, ever.</span>
        </p>

        {!isSubscribed ? (
          <form ref={formRef} onSubmit={handleSubscribe} className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7c7389] pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-[#d9d4e0] rounded-full text-[#171123] placeholder-[#7c7389] focus:outline-none focus:border-[#171123] transition-colors duration-200"
                  disabled={isSubmitting}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-4 bg-[#171123] text-white rounded-full font-semibold text-base transition-colors duration-200 hover:bg-[#6b2fa5] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    <>
                      {/* <Sparkles className="w-4 h-4" /> */}
                      Subscribe
                    </>
                  )}
                </span>
              </button>
            </div>

            {error && <p className="mt-4 text-red-600 text-sm font-medium">{error}</p>}
          </form>
        ) : (
          <div className="max-w-md mx-auto">
            <div className="bg-white border border-[#ece7f1] rounded-2xl p-8">
              <div className="w-14 h-14 bg-[#16a34a] rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#171123] mb-2">Thank you!</h3>
              <p className="text-[#7c7389] mb-5 text-sm">You&rsquo;re now subscribed to the Spotix newsletter.</p>
              <button
                onClick={() => {
                  setIsSubscribed(false)
                  setIsSubmitting(false)
                }}
                className="text-[#6b2fa5] hover:text-[#4c2178] text-sm underline transition-colors"
              >
                Subscribe another email
              </button>
            </div>
          </div>
        )}

        {/* <div ref={trustRef} className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-[#7c7389]">
          {["Secure & Private", "Unsubscribe Anytime", "No Spam, Ever"].map((label) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#6b2fa5] rounded-full" />
              <span>{label}</span>
            </div>
          ))}
        </div> */}
      </div>
    </section>
  )
}

export default Newsletter
