"use client"

interface LoadingScreenProps {
  title?: string
  message?: string
}

export default function LoadingScreen({
  title = "Loading Payment Details",
  message = "Please wait while we prepare your checkout...",
}: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-8 text-center w-full max-w-md mx-auto">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  )
}
