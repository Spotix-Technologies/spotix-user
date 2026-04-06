"use client"

import { ArrowRight, LogIn, Mail, Phone, User } from "lucide-react"
import { useState } from "react"

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!fullName.trim()) newErrors.fullName = "Full name is required"
    if (!email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      // Save guest info to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "spotix_guest_info",
          JSON.stringify({ fullName, email, phone })
        )
      }
      onSubmitGuest(fullName, email, phone)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-8 mb-6">
          <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#6b2fa5] to-purple-700 rounded-xl mx-auto mb-6 shadow-lg">
            <User size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Guest Checkout</h1>
          <p className="text-gray-600 text-center text-sm">
            Enter your details to complete your ticket purchase
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name *
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-3.5 text-gray-400"
                />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    if (errors.fullName) {
                      setErrors((prev) => {
                        const newErrors = { ...prev }
                        delete newErrors.fullName
                        return newErrors
                      })
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border-2 ${
                    errors.fullName
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 bg-gray-50"
                  } focus:outline-none focus:border-[#6b2fa5] focus:bg-white transition-all`}
                  placeholder="John Doe"
                  disabled={isLoading}
                />
              </div>
              {errors.fullName && (
                <p className="text-red-600 text-xs mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-3.5 text-gray-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) {
                      setErrors((prev) => {
                        const newErrors = { ...prev }
                        delete newErrors.email
                        return newErrors
                      })
                    }
                  }}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg border-2 ${
                    errors.email
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 bg-gray-50"
                  } focus:outline-none focus:border-[#6b2fa5] focus:bg-white transition-all`}
                  placeholder="john@example.com"
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-red-600 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute left-3 top-3.5 text-gray-400"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border-2 border-gray-200 bg-gray-50 focus:outline-none focus:border-[#6b2fa5] focus:bg-white transition-all"
                  placeholder="+234 (0) 800 000 0000"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#6b2fa5] to-purple-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              <span>Continue to Payment</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-2 border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            onClick={onShowSignIn}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-white border-2 border-gray-200 text-gray-900 font-bold rounded-lg hover:border-[#6b2fa5] hover:bg-purple-50 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn size={18} />
            <span>Sign In to Your Account</span>
          </button>

          {/* Info Box */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <p className="text-xs text-purple-900">
              <strong>Note:</strong> Create an account later or simply use your email to checkout. Your order confirmation will be sent to your email.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
