"use client"

import { useState } from "react"
import { ArrowRight, LogIn, Mail, Phone, User, X } from "lucide-react"

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
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 overflow-y-auto p-0 sm:p-6">
      <div className="w-full sm:max-w-md my-0 sm:my-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#6b2fa5] via-[#7c3aed] to-[#4f1d8a] px-6 pt-6 pb-8 rounded-t-3xl sm:rounded-t-3xl overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={16} />
          </button>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 mb-3">
              <span className="text-[11px] font-semibold text-purple-100 tracking-wide uppercase">Quick checkout</span>
            </div>
            {/* <h2 className="text-xl font-extrabold text-white mb-1">Checkout as Guest</h2>
            <p className="text-sm text-purple-200">Fill in your details — no account needed.</p> */}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          {/* CTA */}
          <div className="pt-1 space-y-3">
            <button
              type="submit"
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

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={onShowSignIn}
              disabled={isLoading}
              className="w-full py-3 px-6 bg-white border-2 border-gray-200 hover:border-[#6b2fa5] hover:bg-purple-50 text-gray-800 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 text-sm disabled:opacity-50"
            >
              <LogIn size={16} className="text-[#6b2fa5]" />
              Sign In to Your Account
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center leading-relaxed pt-1">
            Your order confirmation will be sent to your email.
          </p>
        </form>
      </div>
    </div>
  )
}
