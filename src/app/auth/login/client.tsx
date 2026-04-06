"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Head from "next/head"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, AlertCircle, Loader2, Shield, User, X } from "lucide-react"
import { auth } from "../../lib/firebase"
import { signInWithEmailAndPassword } from "firebase/auth"

type LoginProps = {}

const LoginClient: React.FC<LoginProps> = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [formTouched, setFormTouched] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || searchParams.get("return_to")

  const words = ["Event", "Party", "Meeting", "Conference", "Gathering", "Workshop"]

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
    let index = 0
    const interval = setInterval(() => {
      const animatedText = document.getElementById("animated-text")
      if (animatedText) {
        animatedText.style.opacity = "0"
        setTimeout(() => {
          animatedText.textContent = words[index]
          animatedText.style.opacity = "1"
          index = (index + 1) % words.length
        }, 300)
      }
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  // Clear error when user starts typing
  useEffect(() => {
    if (formTouched && (email || password)) {
      setError("")
    }
  }, [email, password, formTouched])

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoggingIn(true)
    setFormTouched(true)

    // Client-side validation
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      setLoggingIn(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      setLoggingIn(false)
      return
    }

    try {
      // Step 1: Sign in with Firebase Client SDK
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Step 2: Get ID token
      const idToken = await user.getIdToken()

      // Step 3: Create server session
      const sessionResponse = await fetch("/api/v1/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      })

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json()
        throw new Error(errorData.message || "Failed to create session")
      }

      const sessionData = await sessionResponse.json()

      console.log("✅ Session created successfully")
      console.log("📊 User data:", sessionData.user)

      // Store user data in localStorage (optional, for client-side access)
      if (typeof window !== "undefined") {
        localStorage.setItem("spotix_user", JSON.stringify(sessionData.user))
      }

      setEmail("")
      setPassword("")

      // Step 4: Redirect to the stored redirect URL or home
      const redirectUrl = redirect || "/home"
      console.log("✅ Redirecting to:", redirectUrl)
      router.push(redirectUrl)
    } catch (error: any) {
      console.error("Login error:", error)
      
      // Handle Firebase Auth errors
      let errorMessage = "Unable to sign in. Please try again"
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMessage = "Incorrect email or password"
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please wait and try again"
      } else if (error.code === "auth/network-request-failed") {
        errorMessage = "Please check your internet connection and try again"
      } else if (error.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled"
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      setLoggingIn(false)
    }
  }

  const dismissError = () => {
    setError("")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#6b2fa5] via-purple-600 to-purple-500 flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-white" />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Sign In</title>
        <meta name="description" content="Sign in to your Spotix account to manage events and bookings" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#6b2fa5] via-purple-600 to-purple-500 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Login Form */}
          <div className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 sm:p-10 lg:p-12 max-w-lg w-full mx-auto lg:mx-0">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-3">Welcome Back</h1>
              <p className="text-gray-600 text-base">Sign in to continue your journey with Spotix</p>
            </div>

            {/* Redirect Notice */}
            {redirect && (
              <div className="flex items-start gap-3 p-4 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-400 rounded-xl">
                <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-blue-800 text-sm font-medium">
                    Please sign in to continue to <span className="font-semibold">{redirect}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 mb-6 bg-gradient-to-r from-red-50 to-rose-50 border border-red-400 rounded-xl animate-in slide-in-from-top duration-300">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-800 text-sm font-medium leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={dismissError}
                  className="flex-shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
                  aria-label="Dismiss error"
                >
                  <X size={18} className="text-red-600" />
                </button>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6 mb-8">
              {/* Email Input */}
              <div className="group">
                <label htmlFor="email" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <User size={16} className="text-gray-500" />
                  <span>Email Address</span>
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:border-[#6b2fa5] focus:bg-white focus:shadow-lg focus:shadow-[#6b2fa5]/10 focus:-translate-y-0.5 transition-all duration-200"
                />
              </div>

              {/* Password Input */}
              <div className="group">
                <label htmlFor="password" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                  <Shield size={16} className="text-gray-500" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    minLength={6}
                    className="w-full px-4 py-3.5 pr-12 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:border-[#6b2fa5] focus:bg-white focus:shadow-lg focus:shadow-[#6b2fa5]/10 focus:-translate-y-0.5 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-[#6b2fa5] hover:bg-[#6b2fa5]/10 rounded-lg transition-all duration-200"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loggingIn || !email || !password}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6b2fa5] to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-xl shadow-[#6b2fa5]/30 hover:shadow-2xl hover:shadow-[#6b2fa5]/40 hover:-translate-y-1 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none text-lg"
              >
                {loggingIn ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Signing you in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* Auth Links */}
            <div className="text-center space-y-3 mb-8">
              <p className="text-gray-600 text-sm">
                Don't have an account?{" "}
                <Link 
                  href={redirect ? `/auth/signup?redirect=${encodeURIComponent(redirect)}` : "/auth/signup"}
                  className="text-[#6b2fa5] font-semibold hover:text-purple-700 hover:underline transition-colors"
                >
                  Create account
                </Link>
              </p>
              <p className="text-gray-600 text-sm">
                <Link 
                  href="/auth/forgot-password" 
                  className="text-gray-600 font-medium hover:text-[#6b2fa5] hover:underline transition-colors"
                >
                  Forgot your password?
                </Link>
              </p>
            </div>

            {/* Security Notice */}
            <div className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-xl">
              <Shield size={16} className="text-gray-500" />
              <span className="text-gray-600 text-xs font-medium">
                Your information is protected with enterprise-grade security
              </span>
            </div>
          </div>

          {/* Right Side Text - Hidden on Mobile */}
          <div className="hidden lg:block bg-white/15 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-12 max-w-md text-center">
            <img 
              src="/logo.svg" 
              alt="Spotix Logo" 
              className="w-24 h-24 mx-auto mb-6 rounded-full object-cover drop-shadow-lg"
            />
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              Use Spotix to Book That{" "}
              <span 
                id="animated-text" 
                className="bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-100 bg-clip-text text-transparent transition-opacity duration-300"
              >
                Event
              </span>
            </h2>
            <p className="text-white/90 text-base leading-relaxed">
              Join thousands of event organizers who trust Spotix for seamless event management and booking experiences.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default LoginClient
