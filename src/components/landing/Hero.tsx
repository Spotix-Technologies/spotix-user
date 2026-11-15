"use client"

import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import ScrollExpandMedia from "./ScrollExpandMedia"
import { UI } from "./theme"

// Hero images live in /public. If your filenames differ, change them here only.
const HERO_CARD_IMAGE = "/hero.jpg" // the card that expands on scroll
const HERO_BACKGROUND_IMAGE = "/hero2.jpg" // full-bleed backdrop that fades out

const trustPoints = [
  "Instant QR tickets",
  "Secure payments",
  "Offline ticket scanning",
]

const Hero = () => {
  return (
    <ScrollExpandMedia
      mediaSrc={HERO_CARD_IMAGE}
      mediaAlt="People enjoying a live event on Spotix"
      bgImageSrc={HERO_BACKGROUND_IMAGE}
      kicker="Event tickets & polls across Nigeria"
      title="Spot Your Next Adventure"
    >
      <div className="mx-auto max-w-3xl text-center">
        <div className={`${UI.pill} mb-8`}>
          <span className="h-1.5 w-1.5 rounded-full bg-[#6b2fa5]" />
          Polls creation is now publicly available on Spotix
        </div>

        <h2 className={UI.h2}>Find, book and run unforgettable events</h2>

        <p className={`${UI.lead} mx-auto mt-5 max-w-xl`}>
          The all-in-one platform for finding, booking, and running events. Spotix is your all-inclusive event
          management engine.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/home" className={`${UI.btnPrimary} w-full sm:w-auto`}>
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/auth/signup" className={`${UI.btnOutline} w-full sm:w-auto`}>
            Create Events
          </Link>
        </div>

        {/* <ul className="mt-12 flex flex-col items-center justify-center gap-x-8 gap-y-3 text-sm text-[#4b4257] sm:flex-row">
          {trustPoints.map((point) => (
            <li key={point} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#6b2fa5]" />
              {point}
            </li>
          ))}
        </ul> */}
      </div>
    </ScrollExpandMedia>
  )
}

export default Hero
