"use client"

import { useState } from "react"
import { ArrowRight, LogIn, Mail, Phone, User } from "lucide-react"
import { ResponsiveSheet } from "@/components/ui/responsive-sheet"

interface GuestCheckoutDialogProps {
  onSubmitGuest: (fullName: string, email: string, phone: string) => void
  onShowSignIn: () => void
  onClose: () => void
  isLoading?: boolean
}

/**
 * Dialog version of the old full-screen guest-checkout-form.tsx. Same
 * fields and validation, but collects the buyer's details inline over the
 * checkout page instead of taking over the whole screen — so the event
 * context (what they're paying for) stays visible/dismissible behind it.
 */
export default function GuestCheckoutDialog({
  onSubmitGuest,
  onShowSignIn,
  onClose,
  isLoading = false,
}: GuestCheckoutDialogProps) {
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
    // text-base (16px), not text-sm (14px): iOS Safari auto-zooms the page
    // when a focused input's font-size is under 16px, and that zoom then
    // carries over into the payment page behind this dialog since closing
    // it is a client-side state change, not a real navigation.
    "w-full pl-11 pr-4 py-3 rounded-xl border-2 text-gray-900 text-base font-medium bg-white transition-all duration-200 outline-none placeholder:text-gray-400 placeholder:font-normal"
  const inputNormal = "border-gray-200 hover:border-gray-300 focus:border-[#6b2fa5] focus:ring-4 focus:ring-purple-100"
  const inputError = "border-red-400 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100"

  return (
    <ResponsiveSheet
      open
      onClose={onClose}
      // Only the X closes this (it sends the buyer back to the event page);
      // a stray backdrop tap / Escape / swipe must not navigate away.
      dismissible={false}
      showClose
      size="md"
      icon={
        <div className="w-10 h-10 rounded-xl bg-[#6b2fa5]/10 flex items-center justify-center">
          <User size={18} className="text-[#6b2fa5]" />
        </div>
      }
      title="Quick checkout"
      description="No account needed. Just a few details so we can send your tickets."
      footer={
        <div className="space-y-3">
          <button
            type="submit"
            form="guest-checkout-form"
            disabled={isLoading}
            className="w-full py-3.5 px-6 bg-[#6b2fa5] hover:bg-[#5a2590] active:bg-[#4a1d7a] text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-purple-300/40 hover:shadow-purple-400/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-sm"
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

          <button
            type="button"
            onClick={onShowSignIn}
            disabled={isLoading}
            className="w-full py-2.5 px-6 text-gray-700 hover:text-[#6b2fa5] font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <LogIn size={16} className="text-[#6b2fa5]" />
            Already have an account? Sign in
          </button>
        </div>
      }
    >
      <form id="guest-checkout-form" onSubmit={handleSubmit} className="space-y-4">
      {/* Full Name */}
      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
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
        {errors.fullName && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.fullName}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
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
        {errors.email && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
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

        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Your order confirmation will be sent to your email.
        </p>
      </form>
    </ResponsiveSheet>
  )
}
