"use client"

import React, { useState } from "react"
import { X, AlertTriangle } from "lucide-react"

interface ReportModalProps {
  eventId: string
  eventName: string
  onClose: () => void
}

export const ReportModal: React.FC<ReportModalProps> = ({ eventId, eventName, onClose }) => {
  const [reason, setReason] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const reportReasons = [
    { value: "fake", label: "Fake/Fraudulent Event" },
    { value: "inappropriate", label: "Inappropriate Content" },
    { value: "spam", label: "Spam or Misleading" },
    { value: "dangerous", label: "Dangerous/Illegal Activity" },
    { value: "other", label: "Other" },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason) {
      alert("Please select a reason for reporting")
      return
    }

    if (!description.trim()) {
      alert("Please provide details about your report")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/v1/event/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          reason,
          description,
          reportedAt: new Date().toISOString(),
        }),
        credentials: "same-origin",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSubmitted(true)
          setTimeout(() => {
            onClose()
          }, 2000)
        }
      } else {
        alert("Failed to submit report. Please try again.")
      }
    } catch (error) {
      console.error("Error submitting report:", error)
      alert("Error submitting report")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Report Submitted</h3>
          <p className="text-gray-600">
            Thank you for reporting. Our team will review this event shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Report Event</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <p className="text-sm text-gray-600 mb-2">Event: {eventName}</p>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Reason for Report *
            </label>
            <div className="space-y-2">
              {reportReasons.map((r) => (
                <label key={r.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-4 h-4 text-[#6b2fa5] accent-[#6b2fa5]"
                  />
                  <span className="text-gray-700 font-medium">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about why you're reporting this event..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Be as detailed as possible to help us understand the issue
            </p>
          </div>

          {/* Info Message */}
          <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-200">
            <p>Your report will be reviewed by our team. All reports are confidential.</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason || !description.trim()}
              className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
