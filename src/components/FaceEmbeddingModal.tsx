"use client"

import { useState, useEffect, useRef } from "react"
import { X, Loader2, AlertCircle, CheckCircle, Trash2 } from "lucide-react"
import * as faceapi from "@vladmandic/face-api"
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

type View = "idle" | "confirm" | "camera" | "deleting" | "success" | "deleted" | "error"

const MODEL_URL = "/models/"

export default function FaceEmbeddingModal({
  isOpen,
  ticketId,
  eventId,
  hasExistingEmbedding,
  onClose,
  onSuccess,
  onDeleted,
}: FaceEmbeddingModalProps) {
  const [view, setView]                   = useState<View>("idle")
  const [isProcessing, setIsProcessing]   = useState(false)
  const [errorMessage, setErrorMessage]   = useState<string | null>(null)
  const [modelsReady, setModelsReady]     = useState(false)
  const modelsLoadedRef                   = useRef(false)

  // ── Preload face-api models as soon as the modal opens ───────────────────
  // This runs in the background while the user reads the instructions,
  // so by the time they click "Open Camera & Begin" models are already in memory.
  useEffect(() => {
    if (!isOpen) return
    if (modelsLoadedRef.current) { setModelsReady(true); return }

    let cancelled = false
    Promise.all([
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    ])
      .then(() => {
        if (!cancelled) {
          modelsLoadedRef.current = true
          setModelsReady(true)
        }
      })
      .catch((err) => {
        if (!cancelled) console.error("[FaceEmbeddingModal] Model preload failed:", err)
        // Non-fatal — FaceMarker will show its own error if models aren't ready
      })

    return () => { cancelled = true }
  }, [isOpen])

  // ── Reset view each time the modal opens ─────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setView(hasExistingEmbedding ? "idle" : "confirm")
      setErrorMessage(null)
      setIsProcessing(false)
    }
  }, [isOpen, hasExistingEmbedding])

  // ── API: save embedding ───────────────────────────────────────────────────
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

      if (response.status === 401) { setErrorMessage("You must be logged in."); setView("error"); return }
      if (response.status === 403) { setErrorMessage("You don't have permission for this ticket."); setView("error"); return }
      if (!response.ok || !data.success) { setErrorMessage(data.message || "Failed to save. Please try again."); setView("error"); return }

      setView("success")
      setTimeout(() => { onSuccess?.(); onClose() }, 2200)
    } catch {
      setErrorMessage("An unexpected error occurred.")
      setView("error")
    } finally {
      setIsProcessing(false)
    }
  }

  // ── API: delete embedding ─────────────────────────────────────────────────
  const handleDelete = async () => {
    setView("deleting")
    try {
      const response = await fetch(`/api/v1/ticket/${ticketId}/embedding`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) { setErrorMessage(data.message || "Failed to delete."); setView("error"); return }

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
    // z-[1100] beats the sticky header's z-index: 1000
    // pt-20 gives breathing room so the modal card clears the header on large screens
    // items-start sm:items-center lets it sit naturally on mobile too
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-4 pt-20 sm:pt-4 z-[1100] overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl my-auto">

        {/* ── Header ── */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Face ID Registration</h2>
            {/* Show a small "Loading models…" pill while preloading in background */}
            {!modelsReady && view === "confirm" && (
              <span className="inline-flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-full">
                <Loader2 size={11} className="animate-spin" />
                Preparing…
              </span>
            )}
          </div>
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
                onClick={() => { setErrorMessage(null); setView(hasExistingEmbedding ? "idle" : "confirm") }}
                className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── Idle: existing embedding → manage options ── */}
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

          {/* ── Confirm: instructions while models load in background ── */}
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
                disabled={!modelsReady}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {modelsReady ? (
                  "Open Camera & Begin"
                ) : (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Preparing camera…
                  </>
                )}
              </button>

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

          {/* ── Camera: FaceMarker mounts here and only here ── */}
          {view === "camera" && (
            <FaceMarker
              onEmbeddingComplete={handleEmbeddingComplete}
              isProcessing={isProcessing}
              modelsAlreadyLoaded={modelsReady}
            />
          )}

        </div>
      </div>
    </div>
  )
}