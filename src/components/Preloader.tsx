"use client"

import { useEffect, useState } from "react"
import "./preloader.css"

interface PreloaderProps {
  onLoadingComplete?: () => void
  minDisplayTime?: number // Minimum time to show preloader (ms)
}

export default function Preloader({ onLoadingComplete, minDisplayTime = 5000 }: PreloaderProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onLoadingComplete) {
        setTimeout(onLoadingComplete, 500) // Wait for fade out
      }
    }, minDisplayTime)

    return () => clearTimeout(timer)
  }, [minDisplayTime, onLoadingComplete])

  if (!isVisible) return null

  return (
    <div
      data-hero-hold
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#6b2fa5] via-purple-600 to-[#5a2589] animate-in fade-in duration-300"
    >
      <div className="relative">
        {/* Main SPOTIX Logo using PATH instead of TEXT */}
        <svg
          width="600"
          height="200"
          viewBox="0 0 287.6 95.501"
          className="w-[300px] sm:w-[400px] md:w-[500px] lg:w-[600px]"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradient for stroke */}
            <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="50%" stopColor="#f0e6ff" stopOpacity="1" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* SPOTIX Path - This will work on iOS! */}
          <path
            d="M 0 67.601 L 4.8 59.601 Q 8.4 62.601 12.9 64.501 Q 17.4 66.401 23.4 66.401 Q 30.6 66.401 34.8 63.401 Q 39 60.401 39 55.301 Q 39 52.401 37.8 50.151 Q 36.6 47.901 33.15 45.751 Q 29.7 43.601 23 41.101 Q 15.8 38.301 11.5 35.451 Q 7.2 32.601 5.35 28.951 Q 3.5 25.301 3.5 20.301 Q 3.5 15.301 6.25 11.251 Q 9 7.201 14.35 4.751 Q 19.7 2.301 27.3 2.301 Q 33.5 2.301 38.45 3.551 Q 43.4 4.801 48.1 7.101 L 44.6 15.201 Q 41.2 13.201 36.65 11.851 Q 32.1 10.501 27.1 10.501 Q 20.5 10.501 16.7 13.101 Q 12.9 15.701 12.9 19.801 Q 12.9 22.401 14 24.401 Q 15.1 26.401 18.35 28.301 Q 21.6 30.201 28.1 32.601 Q 35.9 35.501 40.45 38.701 Q 45 41.901 46.9 45.651 Q 48.8 49.401 48.8 54.201 Q 48.8 60.701 45.55 65.301 Q 42.3 69.901 36.55 72.301 Q 30.8 74.701 23.4 74.701 Q 16.1 74.701 10.1 72.751 Q 4.1 70.801 0 67.601 Z M 287.6 68.601 L 280.8 74.401 L 263.3 52.701 L 246 74.201 L 239.6 68.601 L 258.1 47.101 L 240.3 26.501 L 247.3 20.401 L 263.4 41.201 L 279.2 20.801 L 285.9 26.501 L 268.6 46.701 L 287.6 68.601 Z M 71.7 95.501 L 62.7 95.501 L 62.7 34.801 Q 62.7 31.401 61.05 29.951 Q 59.4 28.501 56.8 28.501 L 58.7 21.501 Q 67.9 21.501 70.2 28.801 Q 71.2 27.301 73.45 25.301 Q 75.7 23.301 79.05 21.801 Q 82.4 20.301 86.7 20.301 Q 92.7 20.301 97.95 23.451 Q 103.2 26.601 106.4 32.551 Q 109.6 38.501 109.6 47.001 Q 109.6 55.301 106.4 61.551 Q 103.2 67.801 98.05 71.251 Q 92.9 74.701 86.9 74.701 Q 82.3 74.701 78.3 72.851 Q 74.3 71.001 71.7 68.601 L 71.7 95.501 Z M 183.9 55.601 L 183.9 31.201 L 174.9 31.201 L 174.9 23.401 L 184.1 23.401 L 186 7.001 L 192.9 7.001 L 192.9 23.401 L 207.3 23.401 L 207.3 31.201 L 192.9 31.201 L 192.9 56.301 Q 192.9 62.101 195.35 64.401 Q 197.8 66.701 201.2 66.701 Q 203.7 66.701 205.95 65.901 Q 208.2 65.101 210.1 64.001 L 212.6 71.201 Q 210.6 72.401 207.2 73.551 Q 203.8 74.701 200.1 74.701 Q 192.6 74.701 188.25 69.751 Q 183.9 64.801 183.9 55.601 Z M 144 74.701 Q 136.6 74.701 130.7 71.251 Q 124.8 67.801 121.45 61.651 Q 118.1 55.501 118.1 47.501 Q 118.1 39.101 121.5 33.001 Q 124.9 26.901 130.8 23.601 Q 136.7 20.301 144 20.301 Q 151.3 20.301 157.15 23.601 Q 163 26.901 166.45 32.951 Q 169.9 39.001 169.9 47.301 Q 169.9 55.601 166.5 61.751 Q 163.1 67.901 157.25 71.301 Q 151.4 74.701 144 74.701 Z M 230.6 73.501 L 221.6 73.501 L 221.6 21.501 L 230.6 21.501 L 230.6 73.501 Z M 144 66.701 Q 139.2 66.701 135.45 64.051 Q 131.7 61.401 129.5 56.951 Q 127.3 52.501 127.3 47.301 Q 127.3 38.701 131.7 33.501 Q 136.1 28.301 144 28.301 Q 148.8 28.301 152.55 30.951 Q 156.3 33.601 158.5 37.951 Q 160.7 42.301 160.7 47.501 Q 160.7 56.001 156.3 61.351 Q 151.9 66.701 144 66.701 Z M 71.7 34.901 Q 73.5 32.401 76.95 30.251 Q 80.4 28.101 84.7 28.101 Q 89 28.101 92.55 30.401 Q 96.1 32.701 98.25 37.001 Q 100.4 41.301 100.4 47.301 Q 100.4 56.001 96.15 61.351 Q 91.9 66.701 85.1 66.701 Q 81.1 66.701 77.7 64.951 Q 74.3 63.201 71.7 60.501 L 71.7 34.901 Z M 226.1 12.601 Q 223.5 12.601 221.65 10.701 Q 219.8 8.801 219.8 6.301 Q 219.8 3.401 221.5 1.701 Q 223.2 0.001 226.1 0.001 Q 228.7 0.001 230.55 1.851 Q 232.4 3.701 232.4 6.301 Q 232.4 9.101 230.7 10.851 Q 229 12.601 226.1 12.601 Z"
            fill="none"
            stroke="url(#textGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="spotix-path"
            style={{
              strokeDasharray: 2000,
              strokeDashoffset: 2000,
            }}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Animated dots below */}
        <div className="flex items-center gap-2 justify-center mt-8">
          <div
            className="w-3 h-3 bg-white rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-3 h-3 bg-white rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-3 h-3 bg-white rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
      </div>
    </div>
  )
}