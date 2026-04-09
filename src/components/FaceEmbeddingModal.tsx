"use client"

import { useState, useEffect } from "react"
import { X, Loader2, AlertCircle, CheckCircle, Trash2 } from "lucide-react"
import FaceMarker from "./FaceMarker"

interface FaceEmbeddingModalProps {
  isOpen: boolean
  ticketId: string
  eventId: string
  hasExistingEmbedding: boolean
  onClose: () => void
  onSuccess?: () => void
  onDeleted?: () => void
}

// Internal view states
// "idle"     — existing embedding, show manage options (no camera)
// "confirm"  — first-time enroll: show instructions + "Open Camera" button (no camera yet)
// "camera"   — FaceMarker is mounted and camera is live
// "deleting" — DELETE in progress spinner
// "success"  — POST succeeded
// "deleted"  — DELETE succeeded
// "error"    — any API error
type View = "idle" | "confirm" | "camera" | "deleting" | "success" | "deleted" | "error"

export default function FaceEmbeddingModal({
  isOpen,
  ticketId,
  eventId,
  hasExistingEmbedding,
  onClose,
  onSuccess,
  onDeleted,
}: FaceEmbeddingModalProps) {
  const [view, setView]               = useState<View>("idle")
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Reset every time the modal opens
  useEffect(() => {
    if (isOpen) {
      // If they already have an embedding → manage screen (no camera)
      // If they don't → instructions screen (still no camera)
      setView(hasExistingEmbedding ? "idle" : "confirm")
      setErrorMessage(null)
      setIsProcessing(false)
    }
  }, [isOpen, hasExistingEmbedding])

  // ── API: save embedding ──────────────────────────────────────────────────
  const handleEmbeddingComplete = async (embeddingData: number[]) => {
    setIsProcessing(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/v1/ticket/${ticketId}/embedding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedding: embeddingData, eventId, ticketId }),
      })

      const data = await response.json()

      if (response.status === 401) {
        setErrorMessage("You must be logged in.")
        setView("error")
        return
      }
      if (response.status === 403) {
        setErrorMessage("You don't have permission for this ticket.")
        setView("error")
        return
      }
      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to save. Please try again.")
        setView("error")
        return
      }

      setView("success")
      setTimeout(() => { onSuccess?.(); onClose() }, 2200)
    } catch {
      setErrorMessage("An unexpected error occurred.")
      setView("error")
    } finally {
      setIsProcessing(false)
    }
  }

  // ── API: delete embedding ────────────────────────────────────────────────
  const handleDelete = async () => {
    setView("deleting")
    try {
      const response = await fetch(`/api/v1/ticket/${ticketId}/embedding`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to delete.")
        setView("error")
        return
      }

      setView("deleted")
      setTimeout(() => { onDeleted?.(); onClose() }, 2200)
    } catch {
      setErrorMessage("An unexpected error occurred while deleting.")
      setView("error")
    }
  }

  if (!isOpen) return null

  const canClose = !isProcessing && view !== "deleting"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">

        {/* ── Header ── */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-gray-900">Face ID Registration</h2>
          <button
            onClick={onClose}
            disabled={!canClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-40 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── Success ── */}
          {view === "success" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-green-100 rounded-full mb-4">
                <CheckCircle className="text-green-600" size={48} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Face ID Saved!</h3>
              <p className="text-gray-500 text-sm text-center">You're all set for fast check-in at the event.</p>
            </div>
          )}

          {/* ── Deleted ── */}
          {view === "deleted" && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-gray-100 rounded-full mb-4">
                <Trash2 className="text-gray-500" size={48} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Face Data Removed</h3>
              <p className="text-gray-500 text-sm text-center">Your facial data has been deleted from our system.</p>
            </div>
          )}

          {/* ── Deleting spinner ── */}
          {view === "deleting" && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="animate-spin text-purple-600 mb-4" size={40} />
              <p className="text-gray-600 font-medium">Deleting your facial data…</p>
            </div>
          )}

          {/* ── Error ── */}
          {view === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-semibold text-red-900 text-sm">Something went wrong</p>
                  <p className="text-red-700 text-sm mt-0.5">{errorMessage}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setErrorMessage(null)
                  // Go back to the right starting screen
                  setView(hasExistingEmbedding ? "idle" : "confirm")
                }}
                className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── Idle: existing embedding → manage options (NO camera) ── */}
          {view === "idle" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-semibold text-green-900 text-sm">Face ID already registered</p>
                  <p className="text-green-700 text-sm mt-0.5">
                    You're set for fast check-in. You can re-enroll to update your data or remove it below.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setView("confirm")}
                  className="px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium transition-colors"
                >
                  Re-enroll Face ID
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-xl hover:bg-red-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={15} />
                  Delete Facial Data
                </button>
              </div>
            </div>
          )}

          {/* ── Confirm: instructions before opening camera ── */}
          {/* ── Confirm: instructions before opening camera ── */}
          {view === "confirm" && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 text-sm">How it works</h3>
                <ol className="space-y-2 text-sm text-gray-600">
                  {[
                    "Allow camera access when prompted",
                    "Face tracking starts immediately so you can position yourself",
                    `Click "Start Enroll" when ready — confidence builds as you hold still`,
                    "Your embedding is captured automatically once fully locked in",
                    "Review the capture and confirm to save",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="font-bold text-purple-600 min-w-[18px]">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                <span className="font-semibold">Tip:</span> Find a well-lit spot and look directly at the camera for the best results.
              </div>

              <button
                onClick={() => setView("camera")}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Open Camera & Begin
              </button>

              {/* Allow going back to manage screen if they already had one */}
              {hasExistingEmbedding && (
                <button
                  onClick={() => setView("idle")}
                  className="w-full px-4 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
                >
                  ← Back
                </button>
              )}
            </div>
          )}

          {/* ── Camera: FaceMarker mounts HERE and only here ── */}
          {view === "camera" && (
            <FaceMarker
              onEmbeddingComplete={handleEmbeddingComplete}
              isProcessing={isProcessing}
            />
          )}

        </div>
      </div>
    </div>
  )
}