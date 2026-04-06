"use client"

import React, { useState, useEffect, useRef } from "react"
import FetchWallet from "@/components/fetch-wallet"
import LoginButton from "@/components/LoginButton"
import { getRandomGreeting } from "@/app/lib/greeting"

interface HeaderProps {
  isAuthenticated: boolean
  username: string
}

const CYCLE_INTERVAL_MS = 5000

const Header: React.FC<HeaderProps> = ({ isAuthenticated, username }) => {
  const [greetingText, setGreetingText] = useState("")
  const [visible, setVisible] = useState(true)
  const lastIndexRef = useRef<number | undefined>(undefined)

  // Initialize greeting on mount (client only, avoids SSR mismatch)
  useEffect(() => {
    const { greeting, index } = getRandomGreeting(lastIndexRef.current)
    lastIndexRef.current = index
    setGreetingText(greeting.text)
  }, [])

  // Cycle greetings every 5 seconds with a fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setVisible(false)

      setTimeout(() => {
        const { greeting, index } = getRandomGreeting(lastIndexRef.current)
        lastIndexRef.current = index
        setGreetingText(greeting.text)
        // Fade in
        setVisible(true)
      }, 400) // matches transition duration below
    }, CYCLE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  const nameSuffix = isAuthenticated && username ? `, ${username}` : ""

  return (
    <div className="relative overflow-hidden border-b border-gray-800">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/home.jpg')" }}
        aria-hidden="true"
      />

      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="text-center">

          {/* Cycling greeting with username */}
          <p
            className="text-sm sm:text-base font-medium text-purple-300 mb-1 tracking-wide uppercase"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(-6px)",
              transition: "opacity 0.4s ease, transform 0.4s ease",
            }}
          >
            {greetingText}{nameSuffix}
          </p>

          {/* Main heading */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-purple-400 to-purple-200 bg-clip-text text-transparent">
              Spotix
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-300 mb-5 max-w-xl mx-auto px-4">
            Discover and book amazing events happening around you
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isAuthenticated ? <FetchWallet /> : <LoginButton />}
            <a
              href="https://booker.spotix.com.ng/create-event"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors duration-150"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              Create Event
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// Skeleton
export const HeaderSkeleton: React.FC = () => {
  return (
    <div className="relative overflow-hidden border-b border-gray-800 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="text-center animate-pulse">
          <div className="h-4 bg-gray-700 rounded max-w-xs mx-auto mb-2" />
          <div className="h-9 sm:h-10 bg-gray-700 rounded-lg max-w-sm mx-auto mb-3" />
          <div className="h-5 bg-gray-700 rounded-lg max-w-md mx-auto mb-5" />
          <div className="h-10 w-32 bg-gray-700 rounded-lg mx-auto" />
        </div>
      </div>
    </div>
  )
}

export default Header