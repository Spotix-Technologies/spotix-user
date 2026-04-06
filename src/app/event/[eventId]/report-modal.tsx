"use client"

import type React from "react"

import { useState } from "react"
import { X, Upload, AlertCircle, CheckCircle, Loader2, FileText, Image as ImageIcon, Video, Shield } from "lucide-react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { storage, db, auth } from "@/app/lib/firebase"

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  creatorId: string
  eventName: string
}

type ReportTopic =
  | "Event doesn't exist"
  | "Event planner is below 18"
  | "Event planner doesn't own the event"
  | "Event planner sells contraband"
  | "Misleading event information"
  | "Suspicious activity"
  | "Copyright infringement"
  | "Other"

const REPORT_TOPICS: ReportTopic[] = [
  "Event doesn't exist",
  "Event planner is below 18",
  "Event planner doesn't own the event",
  "Event planner sells contraband",
  "Misleading event information",
  "Suspicious activity",
  "Copyright infringement",
  "Other",
]

const FILE_SIZE_LIMITS = {
  image: 6 * 1024 * 1024, // 6MB
  video: 20 * 1024 * 1024, // 20MB
  document: 5 * 1024 * 1024, // 5MB (pdf, txt)
}

const ALLOWED_FILE_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  video: ["video/mp4", "video/quicktime", "video/x-msvideo"],
  document: ["application/pdf", "text/plain"],
}

export function ReportModal({ isOpen, onClose, eventId, creatorId, eventName }: ReportModalProps) {
  const [topic, setTopic] = useState<ReportTopic>("Event doesn't exist")
  const [heading, setHeading] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const user = auth.currentUser

  const getFileType = (file: File): "image" | "video" | "document" | null => {
    if (ALLOWED_FILE_TYPES.image.includes(file.type)) return "image"
    if (ALLOWED_FILE_TYPES.video.includes(file.type)) return "video"
    if (ALLOWED_FILE_TYPES.document.includes(file.type)) return "document"
    return null
  }

  const getFileIcon = (file: File) => {
    const type = getFileType(file)
    switch (type) {
      case "image":
        return <ImageIcon size={16} className="text-blue-600" />
      case "video":
        return <Video size={16} className="text-purple-600" />
      case "document":
        return <FileText size={16} className="text-green-600" />
      default:
        return <FileText size={16} className="text-gray-600" />
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const fileType = getFileType(file)

    if (!fileType) {
      return { valid: false, error: `File type not allowed: ${file.name}` }
    }

    const sizeLimit = FILE_SIZE_LIMITS[fileType]
    if (file.size > sizeLimit) {
      const limitMB = sizeLimit / (1024 * 1024)
      return { valid: false, error: `${file.name} exceeds ${limitMB}MB limit` }
    }

    return { valid: true }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
    }
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

    setFiles([...files, ...validFiles])
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate heading word count
    const wordCount = heading.trim().split(/\s+/).length
    if (wordCount < 10) {
      setError("Report heading must be at least 10 words")
      return
    }
    if (wordCount > 500) {
      setError("Report heading cannot exceed 500 words")
      return
    }

    if (!user) {
      setError("You must be logged in to submit a report")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Upload files to Firebase Storage
      const fileUrls: string[] = []

      for (const file of files) {
        const timestamp = Date.now()
        const fileRef = ref(storage, `reports/${eventId}/${timestamp}-${file.name}`)
        await uploadBytes(fileRef, file)
        const url = await getDownloadURL(fileRef)
        fileUrls.push(url)
      }

      // Add report to Firestore
      const reportsRef = collection(db, "reports", creatorId, "events", eventId, "reports")

      await addDoc(reportsRef, {
        reporterUid: user.uid,
        reporterEmail: user.email,
        reporterUsername: user.displayName || "Anonymous",
        reportTopic: topic,
        reportHeading: heading,
        supportMaterials: fileUrls,
        eventName: eventName,
        createdAt: serverTimestamp(),
        status: "unresolved",
      })

      setSuccess(true)
      setTimeout(() => {
        onClose()
        resetForm()
      }, 2000)
    } catch (err) {
      console.error("Error submitting report:", err)
      setError("Failed to submit report. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTopic("Event doesn't exist")
    setHeading("")
    setFiles([])
    setError("")
    setSuccess(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 animate-in fade-in slide-in-from-top-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6b2fa5] via-purple-600 to-[#6b2fa5] px-6 md:px-8 py-5 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Report Event</h2>
              <p className="text-sm text-purple-100 mt-0.5">Help us maintain a safe community</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:rotate-90 flex-shrink-0"
            disabled={loading}
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Event Info Banner */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <AlertCircle size={18} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 mb-1">Reporting Event</h3>
                  <p className="text-sm text-gray-700 truncate">{eventName}</p>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {success && (
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-xl p-5 flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <CheckCircle className="text-white" size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-emerald-900 text-lg mb-1">Report Submitted Successfully!</h3>
                  <p className="text-sm text-emerald-700 leading-relaxed">
                    Thank you for helping us maintain a safe community. Our moderation team will review your report within
                    24-48 hours.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-5 flex items-start gap-3 shadow-sm animate-in slide-in-from-top-2">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <AlertCircle className="text-white" size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 text-lg mb-1">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Report Topic */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-900">
                Report Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as ReportTopic)}
                  disabled={loading || success}
                  className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-[#6b2fa5] transition-all bg-white text-slate-900 font-medium disabled:bg-slate-100 disabled:text-slate-500 appearance-none cursor-pointer hover:border-slate-300"
                >
                  {REPORT_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <AlertCircle size={12} className="text-slate-400" />
                Select the category that best describes your concern
              </p>
            </div>

            {/* Report Heading */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-slate-900">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    heading.trim().split(/\s+/).filter((w) => w).length >= 10
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {
                    heading
                      .trim()
                      .split(/\s+/)
                      .filter((w) => w).length
                  }{" "}
                  / 500 words
                </span>
              </div>
              <div className="relative">
                <textarea
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  disabled={loading || success}
                  placeholder="Please provide a detailed description of the issue. Include specific details, dates, and any relevant context that will help our team understand and investigate your report..."
                  className="w-full px-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-[#6b2fa5] transition-all bg-white text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500 resize-none hover:border-slate-300"
                  rows={6}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <p className="text-slate-600 flex items-center gap-1.5">
                  <AlertCircle size={12} className="text-slate-400" />
                  Minimum 10 words required
                </p>
                {heading.trim().split(/\s+/).filter((w) => w).length >= 10 && (
                  <p className="text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle size={12} />
                    Meets minimum requirement
                  </p>
                )}
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-slate-900">
                Supporting Evidence <span className="text-slate-500 font-normal">(Optional)</span>
              </label>

              {/* File Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 md:p-10 text-center transition-all cursor-pointer ${
                  dragActive
                    ? "border-[#6b2fa5] bg-purple-50 scale-[1.02]"
                    : "border-slate-300 bg-slate-50 hover:border-[#6b2fa5] hover:bg-purple-50/50"
                } ${loading || success ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-md mb-4">
                  <Upload size={32} className="text-[#6b2fa5]" />
                </div>
                <p className="font-bold text-slate-900 text-lg mb-2">Drop files here or click to browse</p>
                <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
                  Upload images, videos, or documents to support your report
                </p>

                {/* File Type Info */}
                <div className="grid grid-cols-3 gap-3 mb-6 max-w-lg mx-auto">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-center mb-1">
                      <ImageIcon size={18} className="text-blue-600" />
                    </div>
                    <p className="text-xs font-semibold text-slate-900">Images</p>
                    <p className="text-xs text-slate-500">≤ 6MB</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-center mb-1">
                      <Video size={18} className="text-purple-600" />
                    </div>
                    <p className="text-xs font-semibold text-slate-900">Videos</p>
                    <p className="text-xs text-slate-500">≤ 20MB</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="flex items-center justify-center mb-1">
                      <FileText size={18} className="text-green-600" />
                    </div>
                    <p className="text-xs font-semibold text-slate-900">Documents</p>
                    <p className="text-xs text-slate-500">≤ 5MB</p>
                  </div>
                </div>

                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  disabled={loading || success}
                  className="hidden"
                  id="file-upload"
                  accept="image/*,video/*,.pdf,.txt"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6b2fa5] to-purple-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-700 transition-all cursor-pointer shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105"
                >
                  <Upload size={18} />
                  Select Files
                </label>
                <p className="text-xs text-slate-500 mt-3">Maximum 10 files allowed</p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="bg-white rounded-xl border-2 border-slate-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle size={16} className="text-emerald-600" />
                      {files.length} file(s) attached
                    </p>
                    <span className="text-xs text-slate-500">
                      {files.reduce((acc, file) => acc + file.size, 0) > 0 &&
                        formatFileSize(files.reduce((acc, file) => acc + file.size, 0))}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 hover:border-purple-300 transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                            {getFileIcon(file)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900 truncate font-medium">{file.name}</p>
                            <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={loading || success}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all disabled:text-slate-400 flex-shrink-0 ml-2"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Notice */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Shield size={16} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900 mb-1">Privacy & Confidentiality</h4>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    Your report will be reviewed confidentially by our moderation team. We take all reports seriously and
                    will investigate thoroughly while protecting your privacy.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t-2 border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading || success}
                className="flex-1 px-6 py-3.5 border-2 border-slate-300 rounded-xl font-bold text-slate-900 hover:bg-slate-50 hover:border-slate-400 transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success || !heading.trim() || heading.trim().split(/\s+/).length < 10}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-[#6b2fa5] to-purple-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105"
              >
                {loading && <Loader2 size={20} className="animate-spin" />}
                {loading ? "Submitting Report..." : "Submit Report"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}