"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

interface Particle {
  x: number
  y: number
  r: number
  delay: number
  duration: number
}

const PEEPHOLE_R     = 20
const HOLD_MS        = 1500
const PARTICLE_COUNT = 24
const RING_R         = PEEPHOLE_R + 10
const RING_C         = 2 * Math.PI * RING_R

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x:        Math.random() * 100,
    y:        Math.random() * 100,
    r:        8 + Math.random() * 18,
    delay:    Math.random() * 0.55,
    duration: 0.55 + Math.random() * 0.35,
  }))
}

const PARTICLES = makeParticles()

const Hero = () => {
  const carouselWords = ["Create", "Promote", "Manage", "Sell", "Host"]
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [displayedText, setDisplayedText]       = useState("")
  const [isTyping, setIsTyping]                 = useState(true)
  const [isWaiting, setIsWaiting]               = useState(false)

  const [isVideoMode, setIsVideoMode]       = useState(false)
  const [videoLoaded, setVideoLoaded]       = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [scatterVisible, setScatterVisible] = useState(false)
  const [scatterIn, setScatterIn]           = useState(true)

  // Track hover purely via ref — no re-render needed
  const isHoveringRef = useRef(false)
  const isVideoModeRef = useRef(false) // mirror for use inside rAF

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const heroRef      = useRef<HTMLElement>(null)
  const titleRef     = useRef<HTMLDivElement>(null)
  const subtitleRef  = useRef<HTMLParagraphElement>(null)
  const ctaRef       = useRef<HTMLDivElement>(null)
  const parallaxRef  = useRef<HTMLDivElement>(null)
  const overlayRef   = useRef<HTMLDivElement>(null)
  const wavyRef      = useRef<HTMLDivElement>(null)
  const videoRef     = useRef<HTMLVideoElement>(null)

  // Cursor-driven elements — written to directly, never via state
  const peepholeRef  = useRef<HTMLDivElement>(null)
  const cursorSvgRef = useRef<SVGSVGElement>(null)
  const cursorDotRef = useRef<SVGCircleElement>(null)
  const cursorRingRef = useRef<SVGCircleElement>(null)      // static ring
  const progressArcRef = useRef<SVGCircleElement>(null)     // hold arc
  const hintLabelRef = useRef<HTMLDivElement>(null)

  // Raw cursor position — plain object, no state
  const cursorPos = useRef({ x: -999, y: -999 })

  // Hold refs
  const holdRafRef    = useRef<number | null>(null)
  const holdStartRef  = useRef<number>(0)
  const holdActiveRef = useRef(false)
  const isTransitioningRef = useRef(false)

  // ── Keep refs in sync with state ─────────────────────────────────────────
  useEffect(() => { isVideoModeRef.current = isVideoMode }, [isVideoMode])
  useEffect(() => { isTransitioningRef.current = isTransitioning }, [isTransitioning])

  // ── Write cursor position directly to DOM ────────────────────────────────
  const applyPosition = useCallback((x: number, y: number) => {
    // Peephole clip-path
    if (peepholeRef.current) {
      peepholeRef.current.style.clipPath = isHoveringRef.current
        ? `circle(${PEEPHOLE_R}px at ${x}px ${y}px)`
        : `circle(0px at ${x}px ${y}px)`
    }

    // SVG cursor — translate instead of left/top so the browser composites on GPU
    if (cursorSvgRef.current) {
      cursorSvgRef.current.style.transform =
        `translate(${x - RING_R - 10}px, ${y - RING_R - 10}px)`
      cursorSvgRef.current.style.opacity = isHoveringRef.current ? "1" : "0"
    }

    // Hint label
    if (hintLabelRef.current) {
      hintLabelRef.current.style.transform =
        `translate(${x}px, ${y + RING_R + 18}px) translateX(-50%)`
      hintLabelRef.current.style.opacity = isHoveringRef.current ? "1" : "0"
    }
  }, [])

  const updateCursor = useCallback((x: number, y: number) => {
    cursorPos.current = { x, y }
    applyPosition(x, y)
  }, [applyPosition])

  // ── Mouse / touch handlers ────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    updateCursor(e.clientX, e.clientY)
  }, [updateCursor])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    const t = e.touches[0]
    if (t) updateCursor(t.clientX, t.clientY)
  }, [updateCursor])

  const handleEnter = useCallback(() => {
    isHoveringRef.current = true
    // Open peephole with spring-feel transition (only on enter/leave)
    if (peepholeRef.current) {
      peepholeRef.current.style.transition =
        "clip-path 0.4s cubic-bezier(0.34,1.56,0.64,1)"
    }
    applyPosition(cursorPos.current.x, cursorPos.current.y)
  }, [applyPosition])

  const handleLeave = useCallback(() => {
    isHoveringRef.current = false
    if (peepholeRef.current) {
      peepholeRef.current.style.transition = "clip-path 0.3s ease"
    }
    applyPosition(cursorPos.current.x, cursorPos.current.y)
    cancelHold()
  }, [applyPosition]) // cancelHold defined below — hoisted via ref

  // ── Hold gesture ──────────────────────────────────────────────────────────
  const runScatter = useCallback((toVideo: boolean) => {
    if (isTransitioningRef.current) return
    setIsTransitioning(true)
    setScatterIn(toVideo)
    setScatterVisible(true)

    const totalMs = (0.55 + 0.35 + 0.55) * 1000 + 200
    setTimeout(() => {
      setIsVideoMode(toVideo)
      setScatterVisible(false)
      setIsTransitioning(false)
    }, totalMs)
  }, [])

  // Write hold progress directly to the SVG arc — no state
  const applyHoldProgress = useCallback((progress: number) => {
    if (progressArcRef.current) {
      const dash = progress * RING_C
      progressArcRef.current.style.strokeDasharray = `${dash} ${RING_C}`
      progressArcRef.current.style.opacity = progress > 0 ? "1" : "0"
    }
    if (hintLabelRef.current) {
      hintLabelRef.current.textContent = progress > 0
        ? `${Math.round(progress * 100)}%`
        : isVideoModeRef.current ? "Hold to reveal image" : "Hold to reveal video"
    }
  }, [])

  const cancelHold = useCallback(() => {
    holdActiveRef.current = false
    if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current)
    applyHoldProgress(0)
  }, [applyHoldProgress])

  // Patch handleLeave's dependency now that cancelHold exists
  // (we store it in a ref so the closure stays stable)
  const cancelHoldRef = useRef(cancelHold)
  useEffect(() => { cancelHoldRef.current = cancelHold }, [cancelHold])

  const startHold = useCallback(() => {
    if (isTransitioningRef.current) return
    holdActiveRef.current = true
    holdStartRef.current  = performance.now()

    const tick = () => {
      if (!holdActiveRef.current) return
      const elapsed  = performance.now() - holdStartRef.current
      const progress = Math.min(elapsed / HOLD_MS, 1)
      applyHoldProgress(progress)
      if (progress < 1) {
        holdRafRef.current = requestAnimationFrame(tick)
      } else {
        holdActiveRef.current = false
        applyHoldProgress(0)
        runScatter(!isVideoModeRef.current)
      }
    }
    holdRafRef.current = requestAnimationFrame(tick)
  }, [applyHoldProgress, runScatter])

  useEffect(() => () => cancelHoldRef.current(), [])

  // ── GSAP entrance ─────────────────────────────────────────────────────────
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
  }, [])

  useEffect(() => {
    if (!heroRef.current || !titleRef.current || !subtitleRef.current ||
        !ctaRef.current || !overlayRef.current || !wavyRef.current) return

    const ctx = gsap.context(() => {
      gsap.set([titleRef.current, subtitleRef.current, ctaRef.current], { opacity: 0, y: 60 })
      gsap.set(wavyRef.current, { opacity: 0, y: 20 })

      const tl = gsap.timeline({ delay: 0.3 })
      tl.to(titleRef.current,    { opacity: 1, y: 0, duration: 1,   ease: "power3.out" })
        .to(subtitleRef.current, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.5")
        .to(ctaRef.current,      { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }, "-=0.4")
        .to(wavyRef.current,     { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, "-=0.4")

      if (!isVideoMode && parallaxRef.current) {
        gsap.to(parallaxRef.current, {
          yPercent: 30,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end:   "bottom top",
            scrub: true,
          },
        })
      }

      gsap.to(overlayRef.current, {
        opacity: 0.85,
        ease: "none",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end:   "60% top",
          scrub: true,
        },
      })
    }, heroRef)

    return () => ctx.revert()
  }, [isVideoMode])

  // ── Video play/pause ──────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    isVideoMode ? video.play().catch(() => {}) : video.pause()
  }, [isVideoMode])

  // ── Text carousel ─────────────────────────────────────────────────────────
  useEffect(() => {
    const word = carouselWords[currentWordIndex]
    if (isWaiting) {
      const t = setTimeout(() => {
        setIsWaiting(false)
        setCurrentWordIndex((p) => (p + 1) % carouselWords.length)
        setIsTyping(true)
        setDisplayedText("")
      }, 900)
      return () => clearTimeout(t)
    }
    if (isTyping) {
      if (displayedText.length < word.length) {
        const t = setTimeout(() => setDisplayedText(word.slice(0, displayedText.length + 1)), 100)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setIsTyping(false), 4500)
        return () => clearTimeout(t)
      }
    } else {
      if (displayedText.length > 0) {
        const t = setTimeout(() => setDisplayedText(displayedText.slice(0, -1)), 70)
        return () => clearTimeout(t)
      } else {
        setIsWaiting(true)
      }
    }
  }, [displayedText, isTyping, isWaiting, currentWordIndex])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section
      ref={heroRef}
      className="relative h-screen w-full overflow-hidden flex items-center justify-center"
      style={{ cursor: "none" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onMouseDown={startHold}
      onMouseUp={cancelHold}
      onTouchStart={(e) => {
        const t = e.touches[0]
        if (t) {
          updateCursor(t.clientX, t.clientY)
          isHoveringRef.current = true
          if (peepholeRef.current) {
            peepholeRef.current.style.transition =
              "clip-path 0.4s cubic-bezier(0.34,1.56,0.64,1)"
          }
          applyPosition(t.clientX, t.clientY)
        }
        startHold()
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => {
        isHoveringRef.current = false
        applyPosition(cursorPos.current.x, cursorPos.current.y)
        cancelHold()
      }}
    >

      {/* BG Image */}
      <div
        ref={parallaxRef}
        className={`absolute inset-0 w-full z-0 will-change-transform transition-opacity duration-700 ${isVideoMode ? "opacity-0" : "opacity-100"}`}
        style={{ height: "130%", top: "-15%" }}
      >
        <Image src="/hero.jpg" alt="Hero Background" fill priority quality={75} className="object-cover" sizes="100vw" />
      </div>

      {/* BG Video */}
      <div className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-700 ${isVideoMode ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <video ref={videoRef} loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover" onLoadedData={() => setVideoLoaded(true)}>
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Overlays */}
      <div ref={overlayRef} className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/70 z-[1]" style={{ opacity: 0.72 }} />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#6b2fa5]/25 via-transparent to-purple-600/15 z-[2] pointer-events-none" />

      {/* Scatter circles */}
      {scatterVisible && PARTICLES.map((p, i) => (
        <div
          key={i}
          className="pointer-events-none fixed z-[7]"
          style={{
            left:         `${p.x}vw`,
            top:          `${p.y}vh`,
            width:        `${p.r * 2}vw`,
            height:       `${p.r * 2}vw`,
            transform:    "translate(-50%, -50%)",
            borderRadius: "50%",
            background:   "rgba(0,0,0,0.88)",
            animation:    scatterIn
              ? `scatterGrow ${p.duration}s cubic-bezier(0.34,1.56,0.64,1) ${p.delay}s both`
              : `scatterShrink ${p.duration}s ease-in ${p.delay}s both`,
          }}
        />
      ))}

      {/* Peephole — clip-path written directly by applyPosition() */}
      <div
        ref={peepholeRef}
        className="pointer-events-none fixed inset-0 z-[8]"
        style={{ clipPath: `circle(0px at -999px -999px)` }}
      >
        {!isVideoMode ? (
          <video loop muted playsInline autoPlay className="absolute top-0 left-0 w-screen h-screen object-cover">
            <source src="/hero.mp4" type="video/mp4" />
          </video>
        ) : (
          <div style={{ height: "130%", top: "-15%", position: "absolute", left: 0, right: 0 }}>
            <Image src="/hero.jpg" alt="Hero Background" fill className="object-cover" sizes="100vw" priority />
          </div>
        )}
        {/* Vignette edge */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle, transparent 55%, rgba(0,0,0,0.55) 100%)", zIndex: 1 }} />
      </div>

      {/* Custom cursor SVG — positioned via transform, never left/top */}
      <svg
        ref={cursorSvgRef}
        className="pointer-events-none fixed top-0 left-0 z-[9]"
        style={{
          width:     (RING_R + 10) * 2,
          height:    (RING_R + 10) * 2,
          overflow:  "visible",
          opacity:   0,
          willChange: "transform",
        }}
      >
        {/* Static outer ring */}
        <circle
          ref={cursorRingRef}
          cx={RING_R + 10}
          cy={RING_R + 10}
          r={RING_R}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={2}
        />
        {/* Hold progress arc */}
        <circle
          ref={progressArcRef}
          cx={RING_R + 10}
          cy={RING_R + 10}
          r={RING_R}
          fill="none"
          stroke="#a855f7"
          strokeWidth={3}
          strokeDasharray={`0 ${RING_C}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${RING_R + 10} ${RING_R + 10})`}
          style={{ opacity: 0 }}
        />
        {/* Centre dot */}
        <circle
          ref={cursorDotRef}
          cx={RING_R + 10}
          cy={RING_R + 10}
          r={4}
          fill="white"
          opacity={0.9}
        />
      </svg>

      {/* Hint label — positioned via transform, text written directly */}
      <div
        ref={hintLabelRef}
        className="pointer-events-none fixed top-0 left-0 z-[9] text-white/70 text-xs font-medium tracking-widest uppercase select-none"
        style={{
          opacity:    0,
          willChange: "transform",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          whiteSpace: "nowrap",
        }}
      >
        {isVideoMode ? "Hold to reveal image" : "Hold to reveal video"}
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto">
        <div ref={titleRef} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
          <div className="flex flex-wrap items-center justify-center gap-x-4">
            <span
              className="inline-block min-w-[1ch] bg-gradient-to-r from-[#6b2fa5] via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg"
              style={{ backgroundSize: "200% 200%", animation: "gradientShift 3s ease infinite" }}
            >
              {displayedText}
              <span className="inline-block w-[3px] h-[0.85em] bg-purple-400 ml-1 animate-pulse" style={{ verticalAlign: "middle" }} />
            </span>
            <span className="text-white" style={{ textShadow: "2px 2px 12px rgba(0,0,0,0.9)" }}>
              events with Spotix
            </span>
          </div>
        </div>

        <p
          ref={subtitleRef}
          className="text-lg sm:text-xl md:text-2xl text-gray-100 mb-10 max-w-3xl mx-auto leading-relaxed"
          style={{ textShadow: "1px 1px 8px rgba(0,0,0,0.8)" }}
        >
          Your one-stop platform for finding and booking tickets to the most exciting events
        </p>

        <div ref={ctaRef} className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/home"
            className="group relative px-10 py-4 min-w-[200px] bg-gradient-to-r from-[#6b2fa5] to-purple-600 text-white rounded-full text-lg font-semibold overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/50 hover:scale-105"
            style={{ cursor: "none" }}
          >
            <span className="relative z-10">Get Started</span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <Link
            href="/auth/signup"
            className="group px-10 py-4 min-w-[200px] bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-full text-lg font-semibold transition-all duration-300 hover:bg-white hover:text-[#6b2fa5] hover:scale-105 hover:shadow-xl"
            style={{ cursor: "none" }}
          >
            Create Events
          </Link>
        </div>
      </div>

      {/* Wavy bottom */}
      <div ref={wavyRef} className="absolute bottom-0 left-0 right-0 z-[3] pointer-events-none">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="w-full" style={{ height: "80px" }}>
          <defs>
            <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="50%"  stopColor="#6b2fa5" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          <path d="M0,40 C180,10 360,70 540,40 C720,10 900,70 1080,40 C1260,10 1350,60 1440,40 L1440,80 L0,80 Z" fill="url(#waveGrad)" className="wave-path-1" />
          <path d="M0,55 C200,25 400,75 600,50 C800,25 1000,70 1200,50 C1300,38 1380,55 1440,50 L1440,80 L0,80 Z" fill="rgba(255,255,255,0.05)" className="wave-path-2" />
          <path d="M0,65 C240,45 480,78 720,62 C960,45 1200,75 1440,62 L1440,80 L0,80 Z" fill="white" />
        </svg>
      </div>

      {/* Ambient glows */}
      <div className="absolute top-20 right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse z-[2] pointer-events-none" style={{ animationDuration: "3s" }} />
      <div className="absolute bottom-20 left-10 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl animate-pulse z-[2] pointer-events-none" style={{ animationDuration: "4s", animationDelay: "1s" }} />

      {/* Video loading spinner */}
      {isVideoMode && !videoLoaded && (
        <div className="absolute inset-0 bg-black/50 z-[3] flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <style jsx>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes waveMove1 {
          0%   { d: path("M0,40 C180,10 360,70 540,40 C720,10 900,70 1080,40 C1260,10 1350,60 1440,40 L1440,80 L0,80 Z"); }
          50%  { d: path("M0,50 C180,20 360,60 540,50 C720,20 900,60 1080,50 C1260,20 1350,55 1440,50 L1440,80 L0,80 Z"); }
          100% { d: path("M0,40 C180,10 360,70 540,40 C720,10 900,70 1080,40 C1260,10 1350,60 1440,40 L1440,80 L0,80 Z"); }
        }
        .wave-path-1 { animation: waveMove1 6s ease-in-out infinite; }
        .wave-path-2 { animation: waveMove1 8s ease-in-out infinite reverse; }

        @keyframes scatterGrow {
          from { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          20%  { opacity: 1; }
          to   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes scatterShrink {
          from { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          80%  { opacity: 1; }
          to   { transform: translate(-50%, -50%) scale(0); opacity: 0; }
        }
      `}</style>
    </section>
  )
}

export default Hero