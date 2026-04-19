"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as faceapi from "@vladmandic/face-api"
import { Loader2, AlertCircle, ScanFace } from "lucide-react"

interface FaceMarkerProps {
  onEmbeddingComplete: (embedding: number[]) => void
  isProcessing: boolean
  /** Pass true when FaceEmbeddingModal has already preloaded models — skips the reload */
  modelsAlreadyLoaded?: boolean
}

const MODEL_URL    = "/models/"
const LOCK_THRESHOLD = 0.82
const LOCK_FRAMES    = 18
const CONF_SMOOTH    = 0.12

export default function FaceMarker({ onEmbeddingComplete, isProcessing, modelsAlreadyLoaded = false }: FaceMarkerProps) {
  const videoRef      = useRef<HTMLVideoElement>(null)
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const rafRef        = useRef<number | null>(null)
  const completedRef  = useRef(false)
  const enrollingRef  = useRef(false)
  const lockFramesRef = useRef(0)
  const smoothConfRef = useRef(0)

  const [modelsLoaded, setModelsLoaded]   = useState(modelsAlreadyLoaded)
  const [cameraReady, setCameraReady]     = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [enrolling, setEnrolling]         = useState(false)
  const [smoothConf, setSmoothConf]       = useState(0)
  const [locked, setLocked]               = useState(false)
  const [pendingEmbed, setPendingEmbed]   = useState<number[] | null>(null)

  // ── 1. Load models (skipped if parent already loaded them) + start camera ─
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        if (!modelsAlreadyLoaded) {
          await Promise.all([
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          ])
        }
        if (cancelled) return
        setModelsLoaded(true)
        await startCamera()
      } catch (err) {
        if (!cancelled) {
          console.error("[FaceMarker] Init error:", err)
          setError("Failed to load face detection models. Please refresh and try again.")
        }
      }
    }

    init()

    return () => {
      cancelled = true
      cleanup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { enrollingRef.current = enrolling }, [enrolling])

  const cleanup = useCallback(() => {
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      })
      streamRef.current = stream
      if (!videoRef.current) return
      videoRef.current.srcObject = stream
      videoRef.current.onloadedmetadata = () => {
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width  = videoRef.current.videoWidth
          canvasRef.current.height = videoRef.current.videoHeight
        }
        setCameraReady(true)
        startDetectionLoop()
      }
    } catch (err) {
      console.error("[FaceMarker] Camera error:", err)
      setError("Unable to access camera. Please check permissions and try again.")
    }
  }

  // ── 2. Detection loop ─────────────────────────────────────────────────────
  const startDetectionLoop = () => {
    const detect = async () => {
      if (completedRef.current) return

      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      try {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }))
          .withFaceLandmarks()
          .withFaceDescriptors()

        const ctx = canvas.getContext("2d")
        if (!ctx) { rafRef.current = requestAnimationFrame(detect); return }
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (detections.length === 0) {
          lockFramesRef.current = 0
          setSmoothConf(0)
          smoothConfRef.current = 0
          ctx.fillStyle = "rgba(239,68,68,0.85)"
          ctx.font = "bold 13px system-ui"
          ctx.fillText("No face detected — move closer or improve lighting", 10, 26)
          rafRef.current = requestAnimationFrame(detect)
          return
        }

        const displaySize = { width: video.videoWidth, height: video.videoHeight }
        const resized = faceapi.resizeResults(detections, displaySize)
        const best    = resized.reduce((a, b) => a.detection.score > b.detection.score ? a : b)
        const score   = best.detection.score

        smoothConfRef.current = smoothConfRef.current + (score - smoothConfRef.current) * CONF_SMOOTH
        const sc = smoothConfRef.current

        const isLocked = enrollingRef.current && score >= LOCK_THRESHOLD
        if (isLocked) {
          lockFramesRef.current = Math.min(lockFramesRef.current + 1, LOCK_FRAMES)
        } else {
          lockFramesRef.current = Math.max(lockFramesRef.current - 2, 0)
        }

        const lockRatio   = lockFramesRef.current / LOCK_FRAMES
        const fullyLocked = lockRatio >= 1 && enrollingRef.current

        setLocked(fullyLocked)
        setSmoothConf(sc)

        const landmarkColor = fullyLocked ? "#22c55e" : sc > 0.65 ? "#a78bfa" : "#7c3aed"
        const textColor     = fullyLocked ? "#22c55e" : sc > 0.65 ? "#fbbf24" : "#f87171"

        ctx.strokeStyle = landmarkColor
        ctx.fillStyle   = landmarkColor
        ctx.lineWidth   = fullyLocked ? 2 : 1.5

        const lm = best.landmarks
        const drawPoints = (pts: faceapi.Point[]) => {
          for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, fullyLocked ? 2.5 : 2, 0, Math.PI * 2); ctx.fill() }
        }
        const drawCurve = (pts: faceapi.Point[]) => {
          if (pts.length < 2) return
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
          ctx.stroke()
        }

        drawCurve(lm.getJawOutline()); drawCurve(lm.getLeftEyeBrow()); drawCurve(lm.getRightEyeBrow())
        drawCurve(lm.getLeftEye()); drawCurve(lm.getRightEye()); drawCurve(lm.getNose()); drawCurve(lm.getMouth())
        drawPoints(lm.positions)

        const box = best.detection.box
        const progressBarWidth = box.width * lockRatio
        ctx.strokeStyle = landmarkColor; ctx.lineWidth = 2
        ctx.strokeRect(box.x, box.y, box.width, box.height)
        if (enrollingRef.current && lockRatio > 0) {
          ctx.fillStyle = landmarkColor + "55"
          ctx.fillRect(box.x, box.y + box.height + 4, progressBarWidth, 4)
        }

        ctx.fillStyle = textColor
        ctx.font = "bold 13px system-ui"
        if (enrollingRef.current) {
          ctx.fillText(`Confidence: ${(sc * 100).toFixed(1)}%`, 10, 22)
          ctx.fillText(fullyLocked ? "Face locked — capturing…" : `Lock: ${Math.round(lockRatio * 100)}%`, 10, 42)
        } else {
          ctx.fillText("Tracking active — click Start to enroll", 10, 22)
        }

        if (fullyLocked && !completedRef.current) {
          const embedding = Array.from(best.descriptor)
          completedRef.current = true
          setPendingEmbed(embedding)
          cleanup()
          return
        }
      } catch (err) {
        console.error("[FaceMarker] Detection error:", err)
      }

      rafRef.current = requestAnimationFrame(detect)
    }

    detect()
  }

  // ── 3. User actions ───────────────────────────────────────────────────────
  const handleStartEnroll = () => {
    lockFramesRef.current = 0; smoothConfRef.current = 0
    completedRef.current = false; setPendingEmbed(null); setLocked(false); setEnrolling(true)
  }

  const handleConfirm = () => { if (pendingEmbed) onEmbeddingComplete(pendingEmbed) }

  const handleRetry = () => {
    completedRef.current = false; lockFramesRef.current = 0; smoothConfRef.current = 0
    setPendingEmbed(null); setLocked(false); setEnrolling(false); setSmoothConf(0)
    startCamera()
  }

  // ── 4. Render ─────────────────────────────────────────────────────────────
  // If models were preloaded, skip the models-loading step — only wait for camera
  const loading = !modelsLoaded || (!cameraReady && !error)

  return (
    <div className="w-full space-y-4">

      {loading && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <Loader2 className="animate-spin text-purple-600" size={32} />
          <span className="text-gray-500 text-sm">
            {!modelsLoaded ? "Loading face detection models…" : "Starting camera…"}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold text-red-900 text-sm">Camera Error</p>
            <p className="text-red-700 text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {!error && (
        <div className="relative bg-black rounded-xl overflow-hidden" style={{ display: loading ? "none" : "block" }}>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto block" />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

          {cameraReady && !enrolling && !pendingEmbed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px]">
              <button
                onClick={handleStartEnroll}
                className="flex flex-col items-center gap-3 px-8 py-5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-2xl font-semibold text-base shadow-lg transition-all duration-150"
              >
                <ScanFace size={32} strokeWidth={1.5} />
                Start Enroll
              </button>
              <p className="text-white/70 text-xs mt-4 text-center px-6">
                Face tracking is active. Click to begin capturing your Face ID.
              </p>
            </div>
          )}

          {locked && !pendingEmbed && (
            <div className="absolute inset-0 pointer-events-none border-4 border-green-400 rounded-xl animate-pulse" />
          )}
        </div>
      )}

      {pendingEmbed && (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-green-900 font-semibold text-sm">✓ Face captured successfully</p>
            <p className="text-green-700 text-sm mt-0.5">128-point embedding ready. Confirm to save your Face ID.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleRetry} disabled={isProcessing} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors">
              Retake
            </button>
            <button onClick={handleConfirm} disabled={isProcessing} className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {isProcessing ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : "Confirm & Save"}
            </button>
          </div>
        </div>
      )}

      {enrolling && !pendingEmbed && cameraReady && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Confidence</span>
            <span className={locked ? "text-green-600 font-semibold" : "text-gray-500"}>
              {locked ? "Locked ✓" : `${(smoothConf * 100).toFixed(1)}%`}
            </span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${Math.min(smoothConf * 100, 100)}%`, background: locked ? "#22c55e" : smoothConf > 0.65 ? "#a78bfa" : "#7c3aed" }}
            />
          </div>
        </div>
      )}

      {!enrolling && !pendingEmbed && cameraReady && (
        <p className="text-center text-gray-400 text-xs">Make sure your face is well-lit and clearly visible before starting.</p>
      )}
    </div>
  )
}