"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { X } from "lucide-react"

const Dialog = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Mount slightly after the page settles so it doesn't fight the preloader/fade-in
    const showTimer = setTimeout(() => {
      setIsVisible(true)
      requestAnimationFrame(() => setIsOpen(true))
    }, 600)
    return () => clearTimeout(showTimer)
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    // Wait for the exit transition before unmounting
    setTimeout(() => setIsVisible(false), 250)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    if (isVisible) document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-4 transition-opacity duration-250 ${
        isOpen ? "opacity-100" : "opacity-0"
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="discover-dialog-heading"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#171123]/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-md bg-white rounded-[1.75rem] overflow-hidden shadow-2xl transition-all duration-300 ${
          isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-[#171123] hover:bg-white transition-colors duration-200"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image */}
        <div className="relative w-full aspect-[16/10]">
          <Image
            src="/discover.png"
            alt="Spotix Event Discovery"
            fill
            priority
            sizes="(max-width: 480px) 100vw, 448px"
            className="object-cover"
          />
        </div>

        {/* Body */}
        <div className="px-7 py-7 text-center">
          <h2
            id="discover-dialog-heading"
            className="text-2xl font-bold text-[#171123] mb-3 leading-tight"
          >
            Spotix Event Discovery is Live
          </h2>
          <p className="text-[#5b5468] text-base leading-relaxed mb-7">
            Find events all across Nigeria that you can attend. Let us be the guide to your vibe.
          </p>

          <Link
            href="/discover"
            onClick={handleClose}
            className="inline-flex items-center justify-center w-full px-8 py-4 bg-[#6b2fa5] text-white rounded-full text-base font-semibold transition-all duration-300 hover:bg-[#5a2589] hover:shadow-lg hover:shadow-[#6b2fa5]/25"
          >
            Let's Discover
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dialog