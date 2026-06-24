"use client"

import { Loader2 } from "lucide-react"

export default function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Your Registration</h2>
        <p className="text-gray-600">Please wait while we generate your ticket...</p>
        <div className="mt-6 space-y-2">
          {["Verifying registration", "Generating ticket", "Sending confirmation"].map((step) => (
            <div key={step} className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
