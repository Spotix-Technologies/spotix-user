"use client"

import { useState, useEffect } from "react"
import { X, Phone, Loader2 } from "lucide-react"
import { authFetch } from "@/app/lib/auth-client-user"

interface AddPhoneNumberProps {
  onPhoneNumberAdded: (phoneNumber: string) => void
  onClose: () => void
}

export default function AddPhoneNumber({ onPhoneNumberAdded, onClose }: AddPhoneNumberProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const validatePhoneNumber = (phone: string): boolean => {
    // Nigerian phone number validation
    // Accepts formats: 08012345678, 2348012345678, +2348012345678
    const phoneRegex = /^(\+?234|0)?[789]\d{9}$/
    return phoneRegex.test(phone.replace(/\s/g, ""))
  }

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, "")
    
    // Ensure it starts with +234 or convert 0 to +234
    if (cleaned.startsWith("0")) {
      cleaned = "+234" + cleaned.substring(1)
    } else if (cleaned.startsWith("234")) {
      cleaned = "+" + cleaned
    } else if (!cleaned.startsWith("+234")) {
      cleaned = "+234" + cleaned
    }
    
    return cleaned
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!phoneNumber.trim()) {
      setError("Phone number is required")
      return
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError("Please enter a valid Nigerian phone number")
      return
    }

    setLoading(true)

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber)

      const res = await authFetch("/api/v1/user/me", {
        method: "PATCH",
        body:   JSON.stringify({ phoneNumber: formattedPhone }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || "Failed to save phone number. Please try again.")
        setLoading(false)
        return
      }

      console.log("Phone number saved successfully:", formattedPhone)

      // Call parent callback with formatted phone number
      onPhoneNumberAdded(formattedPhone)
    } catch (error) {
      console.error("Error saving phone number:", error)
      setError("Failed to save phone number. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for animation to complete
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isVisible ? "opacity-50" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl transform transition-all duration-300 ${
          isVisible ? "translate-y-0 sm:scale-100" : "translate-y-full sm:translate-y-0 sm:scale-95"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Phone className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Phone Number Required</h3>
              <p className="text-sm text-gray-600">We need your phone number to proceed</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="tel"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value)
                  setError("")
                }}
                placeholder="08012345678"
                className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none transition-all ${
                  error
                    ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                    : "border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                }`}
                disabled={loading}
                autoFocus
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <X size={14} />
                {error}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Enter your Nigerian phone number (e.g., 08012345678)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !phoneNumber.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </div>
        </form>

        {/* Security Notice */}
        <div className="px-6 pb-6">
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <p className="text-xs text-purple-700">
              🔒 Your phone number will be securely stored and used for payment verification and order updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}