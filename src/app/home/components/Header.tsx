"use client"

import React, { useState } from "react"
import FetchWallet from "@/components/fetch-wallet"
import { getRandomGreeting } from "@/app/lib/greeting"
import HeroAuthAction from "./HeroAuthAction"

interface HeaderProps {
  isAuthenticated: boolean
  username: string
}

/** Slim page hero: a localized greeting, the page title and today's date. */
const Header: React.FC<HeaderProps> = ({ isAuthenticated, username }) => {
  // Mounted client-side only (behind the preloader), so a random pick is hydration-safe.
  const [greeting] = useState(() => getRandomGreeting().greeting.text)
  const [today] = useState(() =>
    new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
  )

  return (
    <header className="relative isolate overflow-hidden bg-neutral-950">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-45"
        style={{ backgroundImage: "url('/home.jpg')" }}
      />
      <div className="mx-auto max-w-5xl px-4 py-10 text-center sm:px-6 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
          {greeting}
          {isAuthenticated && username ? `, ${username}` : ""}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">All Events</h1>
        <p className="mt-2 text-sm text-white/60">{today}</p>
        <div className="mt-5 flex justify-center">{isAuthenticated ? <FetchWallet /> : <HeroAuthAction />}</div>
      </div>
    </header>
  )
}

export default Header
