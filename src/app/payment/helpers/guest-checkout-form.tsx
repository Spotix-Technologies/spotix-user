"use client"

import { ArrowRight, LogIn, Mail, Phone, User } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

interface GuestCheckoutFormProps {
  onSubmitGuest: (fullName: string, email: string, phone: string) => void
  onShowSignIn: () => void
  isLoading?: boolean
}

export default function GuestCheckoutForm({
  onSubmitGuest,
  onShowSignIn,
  isLoading = false,
}: GuestCheckoutFormProps) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [focused, setFocused] = useState<string | null>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!fullName.trim()) newErrors.fullName = "Full name is required"
    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    if (typeof window !== "undefined") {
      localStorage.setItem("spotix_guest_info", JSON.stringify({ fullName, email, phone }))
    }
    onSubmitGuest(fullName, email, phone)
  }

  const inputBase =
    "w-full pl-11 pr-4 py-3.5 rounded-xl border-2 text-gray-900 text-sm font-medium bg-white transition-all duration-200 outline-none placeholder:text-gray-400 placeholder:font-normal"
  const inputNormal = "border-gray-200 hover:border-gray-300 focus:border-[#6b2fa5] focus:ring-4 focus:ring-purple-100"
  const inputError = "border-red-400 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100"

  return (
    <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row rounded-3xl overflow-hidden shadow-2xl shadow-purple-200/40 border border-purple-100">

          {/* ── Left panel: illustration ──────────────────────────────── */}
          <div className="lg:w-5/12 bg-gradient-to-br from-[#6b2fa5] via-[#7c3aed] to-[#4f1d8a] flex flex-col items-center justify-center p-8 lg:p-12 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2djZoNnYtNmgtNnptLTEyIDB2Nmg2di02aC02em0tNiAwdjZoNnYtNmgtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />

            {/* SVG illustration */}
            <div className="relative z-10 w-full max-w-xs mb-8">
              <Image
                src="/guest.svg"
                alt="Guest checkout"
                width={320}
                height={280}
                className="w-full h-auto drop-shadow-2xl"
                priority
              />
            </div>

            {/* Copy */}
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-4">
                <span className="text-xs font-semibold text-purple-100 tracking-wide uppercase">Quick checkout</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight mb-3">
                No account?<br />No problem.
              </h2>
              <p className="text-sm text-purple-200 leading-relaxed max-w-xs">
                Grab your tickets in seconds. Your confirmation goes straight to your inbox.
              </p>
            </div>
          </div>

          {/* ── Right panel: form ────────────────────────────────────── */}
          <div className="lg:w-7/12 bg-white flex flex-col justify-center p-8 lg:p-12">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-1.5">
                Guest Checkout
              </h1>
              <p className="text-sm text-gray-500">
                Fill in your details and we'll send your ticket right away.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                      focused === "fullName" ? "text-[#6b2fa5]" : "text-gray-400"
                    }`}
                  />
                  <input
                    type="text"
                    value={fullName}
                    onFocus={() => setFocused("fullName")}
                    onBlur={() => setFocused(null)}
                    onChange={(e) => { setFullName(e.target.value); clearError("fullName") }}
                    className={`${inputBase} ${errors.fullName ? inputError : inputNormal}`}
                    placeholder="John Doe"
                    disabled={isLoading}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                      focused === "email" ? "text-[#6b2fa5]" : "text-gray-400"
                    }`}
                  />
                  <input
                    type="email"
                    value={email}
                    onFocus={() => setFocused("email")}
                    onBlur={() => setFocused(null)}
                    onChange={(e) => { setEmail(e.target.value); clearError("email") }}
                    className={`${inputBase} ${errors.email ? inputError : inputNormal}`}
                    placeholder="john@example.com"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Phone Number <span className="text-gray-400 font-normal normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                      focused === "phone" ? "text-[#6b2fa5]" : "text-gray-400"
                    }`}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onFocus={() => setFocused("phone")}
                    onBlur={() => setFocused(null)}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`${inputBase} ${inputNormal}`}
                    placeholder="+234 800 000 0000"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* CTA */}
              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 bg-[#6b2fa5] hover:bg-[#5a2590] active:bg-[#4a1d7a] text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-purple-300/40 hover:shadow-purple-400/50 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 flex items-center justify-center gap-2.5 text-sm"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <>
                      Continue to Payment
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <button
                  type="button"
                  onClick={onShowSignIn}
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 bg-white border-2 border-gray-200 hover:border-[#6b2fa5] hover:bg-purple-50 text-gray-800 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 text-sm disabled:opacity-50"
                >
                  <LogIn size={16} className="text-[#6b2fa5]" />
                  Sign In to Your Account
                </button>
              </div>
            </form>

            {/* Trust note */}
            <p className="mt-6 text-xs text-gray-400 text-center leading-relaxed">
              Your order confirmation will be sent to your email.{" "}
              <span className="text-[#6b2fa5] font-medium">No account needed.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}