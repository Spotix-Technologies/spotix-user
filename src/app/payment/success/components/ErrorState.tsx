"use client"

import { XCircle } from "lucide-react"

interface ErrorStateProps {
  error: string
  reference: string | null
  onRetry: () => void
  onGoHome: () => void
}

export default function ErrorState({ error, reference, onRetry, onGoHome }: ErrorStateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">Registration Issue</h2>
        <p className="text-gray-600 text-center mb-6">{error}</p>
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full py-3 px-6 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onGoHome}
            className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Back to Home
          </button>
        </div>
        {reference && (
          <p className="text-center text-sm text-gray-500 mt-6">
            If you need assistance, please contact support with reference:{" "}
            <span className="font-mono">{reference}</span>
          </p>
        )}
      </div>
    </div>
  )
}
