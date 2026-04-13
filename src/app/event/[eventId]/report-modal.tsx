// app/event/[eventId]/report-modal.tsx

"use client"

import React, { useState } from "react"
import { X, AlertTriangle, Upload, CheckCircle, Loader2, FileText, Image as ImageIcon, Video, Shield } from "lucide-react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage, auth } from "@/app/lib/firebase"

interface ReportModalProps {
  eventId: string
  eventName: string
  onClose: () => void
}

const FILE_SIZE_LIMITS = {
  image: 6 * 1024 * 1024,
  video: 20 * 1024 * 1024,
  document: 5 * 1024 * 1024,
}

const ALLOWED_FILE_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  video: ["video/mp4", "video/quicktime", "video/x-msvideo"],
  document: ["application/pdf", "text/plain"],
}

export const ReportModal: React.FC<ReportModalProps> = ({ eventId, eventName, onClose }) => {
  const [reason, setReason] = useState("")
  const [otherReason, setOtherReason] = useState("")
  const [description, setDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const reportReasons = [
    { value: "fake", label: "Fake/Fraudulent Event" },
    { value: "inappropriate", label: "Inappropriate Content" },
    { value: "spam", label: "Spam or Misleading" },
    { value: "dangerous", label: "Dangerous/Illegal Activity" },
    { value: "underage", label: "Event Planner is Below 18" },
    { value: "contraband", label: "Event Planner Sells Contraband" },
    { value: "copyright", label: "Copyright Infringement" },
    { value: "other", label: "Other" },
  ]

  const getFileType = (file: File): "image" | "video" | "document" | null => {
    if (ALLOWED_FILE_TYPES.image.includes(file.type)) return "image"
    if (ALLOWED_FILE_TYPES.video.includes(file.type)) return "video"
    if (ALLOWED_FILE_TYPES.document.includes(file.type)) return "document"
    return null
  }

  const getFileIcon = (file: File) => {
    const type = getFileType(file)
    switch (type) {
      case "image": return <ImageIcon size={16} className="text-blue-600" />
      case "video": return <Video size={16} className="text-purple-600" />
      case "document": return <FileText size={16} className="text-green-600" />
      default: return <FileText size={16} className="text-gray-600" />
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const fileType = getFileType(file)
    if (!fileType) return { valid: false, error: `File type not allowed: ${file.name}` }
    const sizeLimit = FILE_SIZE_LIMITS[fileType]
    if (file.size > sizeLimit) {
      return { valid: false, error: `${file.name} exceeds ${sizeLimit / (1024 * 1024)}MB limit` }
    }
    return { valid: true }
  }

  const addFiles = (newFiles: File[]) => {
    setError("")
    if (files.length + newFiles.length > 10) {
      setError("Maximum 10 files allowed")
      return
    }
    const validFiles: File[] = []
    for (const file of newFiles) {
      const validation = validateFile(file)
      if (!validation.valid) {
        setError(validation.error || "File validation failed")
        return
      }
      validFiles.push(file)
    }
    setFiles((prev) => [...prev, ...validFiles])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files))
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files))
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setError("")

    const finalReason = reason === "other" ? otherReason.trim() : reason
    if (!reason) { setError("Please select a reason for reporting"); return }
    if (reason === "other" && !otherReason.trim()) { setError("Please describe your reason"); return }
    if (!description.trim()) { setError("Please provide a description"); return }

    setSubmitting(true)

    try {
      const fileUrls: string[] = []

      for (const file of files) {
        const fileRef = ref(storage, `reports/${eventId}/${Date.now()}-${file.name}`)
        await uploadBytes(fileRef, file)
        const url = await getDownloadURL(fileRef)
        fileUrls.push(url)
      }

      const response = await fetch("/api/v1/event/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          reason: finalReason,
          description,
          supportMaterials: fileUrls,
          reportedAt: new Date().toISOString(),
        }),
        credentials: "same-origin",
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSubmitted(true)
          setTimeout(() => onClose(), 2500)
        } else {
          setError("Failed to submit report. Please try again.")
        }
      } else {
        setError("Failed to submit report. Please try again.")
      }
    } catch (err) {
      console.error("Error submitting report:", err)
      setError("Error submitting report. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-start justify-center z-50 px-4 pt-20 pb-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Report Submitted</h3>
          <p className="text-gray-600">
            Thank you for reporting. Our team will review this event within 24–48 hours.
          </p>
        </div>
      </div>
    )
  }

  // ── Main modal ────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-start justify-center z-50 px-4 pt-20 pb-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl flex flex-col max-h-[calc(100vh-6rem)]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-[#6b2fa5] to-purple-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Report Event</h2>
              <p className="text-xs text-purple-200">Help us maintain a safe community</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X size={22} className="text-white" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Event label */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <p className="text-xs text-purple-600 font-medium mb-0.5">Reporting event</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{eventName}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Reason for Report <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {reportReasons.map((r) => (
                <label key={r.value} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={(e) => { setReason(e.target.value); setError("") }}
                    className="w-4 h-4 accent-[#6b2fa5]"
                  />
                  <span className="text-sm text-gray-700 font-medium group-hover:text-[#6b2fa5] transition-colors">
                    {r.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Other reason text box */}
            {reason === "other" && (
              <div className="mt-3">
                <input
                  type="text"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Please specify your reason..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent transition-all"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide details about why you're reporting this event. Include specific details, dates, and any relevant context..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent resize-none transition-all"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">Be as detailed as possible to help us understand the issue</p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Supporting Evidence <span className="text-gray-400 font-normal">(Optional)</span>
            </label>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                dragActive
                  ? "border-[#6b2fa5] bg-purple-50"
                  : "border-gray-300 bg-gray-50 hover:border-[#6b2fa5] hover:bg-purple-50/50"
              }`}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm mb-3">
                <Upload size={22} className="text-[#6b2fa5]" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">Drop files here or click to browse</p>

              {/* File type info */}
              <div className="flex items-center justify-center gap-4 my-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><ImageIcon size={12} className="text-blue-500" /> Images ≤6MB</span>
                <span className="flex items-center gap-1"><Video size={12} className="text-purple-500" /> Videos ≤20MB</span>
                <span className="flex items-center gap-1"><FileText size={12} className="text-green-500" /> Docs ≤5MB</span>
              </div>

              <input
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={submitting}
                className="hidden"
                id="file-upload"
                accept="image/*,video/*,.pdf,.txt"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6b2fa5] text-white text-sm rounded-lg font-semibold hover:bg-purple-700 transition-colors cursor-pointer"
              >
                <Upload size={16} />
                Select Files
              </label>
              <p className="text-xs text-gray-400 mt-2">Maximum 10 files</p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-3 bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
                  <CheckCircle size={14} className="text-green-500" />
                  {files.length} file{files.length > 1 ? "s" : ""} attached
                </p>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                        {getFileIcon(file)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={submitting}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-2 flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Shield size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-700 leading-relaxed">
              Your report is confidential. Our moderation team will review it and investigate thoroughly while protecting your privacy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !reason || !description.trim() || (reason === "other" && !otherReason.trim())}
            className="flex-1 py-2.5 px-4 bg-[#6b2fa5] text-white rounded-lg font-semibold text-sm hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  )
}