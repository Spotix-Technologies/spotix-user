"use client"

import { useEffect, useRef, useState } from "react"
import * as faceapi from "@vladmandic/face-api"
import { Loader2, AlertCircle } from "lucide-react"

interface FaceMarkerProps {
  onEmbeddingComplete: (embedding: number[]) => void
  isProcessing: boolean
}

export default function FaceMarker({ onEmbeddingComplete, isProcessing }: FaceMarkerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [embeddings, setEmbeddings] = useState<number[]>([])
  const [confidence, setConfidence] = useState<number>(0)
  const detectionLoopRef = useRef<number | null>(null)
  const completedRef = useRef(false)

  useEffect(() => {
    const init = async () => {
      try {
        const MODEL_URL = "/models/"
        await Promise.all([
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL), // ← NOT Tiny; recognition net needs full 68-point landmarks
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        ])
        setLoading(false)
        await startCamera()
      } catch (err) {
        console.error("[FaceMarker] Model load error:", err)
        setError("Failed to load face detection models. Please refresh and try again.")
        setLoading(false)
      }
    }
    init()

    return () => {
      stopCamera()
      if (detectionLoopRef.current) cancelAnimationFrame(detectionLoopRef.current)
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Wait for video to be ready before starting detection
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth
            canvasRef.current.height = videoRef.current.videoHeight
          }
          startDetection()
        }
      }
    } catch (err) {
      console.error("[FaceMarker] Camera error:", err)
      setError("Unable to access camera. Please check permissions and try again.")
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((t) => t.stop())
    }
  }

  const startDetection = () => {
    const detect = async () => {
      if (!videoRef.current || !canvasRef.current || isProcessing || completedRef.current) {
        detectionLoopRef.current = requestAnimationFrame(detect)
        return
      }

      const video = videoRef.current
      const canvas = canvasRef.current

      // Guard: video must have real dimensions
      if (video.readyState < 2 || video.videoWidth === 0) {
        detectionLoopRef.current = requestAnimationFrame(detect)
        return
      }

      try {
        // ✅ Chain withFaceDescriptors() — this handles internal cropping correctly
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
          .withFaceLandmarks()     // uses faceLandmark68Net
          .withFaceDescriptors()   // uses faceRecognitionNet

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          detectionLoopRef.current = requestAnimationFrame(detect)
          return
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (detections.length === 0) {
          ctx.fillStyle = "#ef4444"
          ctx.font = "14px Arial"
          ctx.fillText("No face detected — move closer or improve lighting", 10, 25)
          detectionLoopRef.current = requestAnimationFrame(detect)
          return
        }

        // Resize detections to match canvas display size
        const displaySize = { width: video.videoWidth, height: video.videoHeight }
        const resized = faceapi.resizeResults(detections, displaySize)

        // Draw landmarks
        ctx.strokeStyle = "#7c3aed"
        ctx.fillStyle = "#7c3aed"
        ctx.lineWidth = 1.5

        for (const det of resized) {
          const lm = det.landmarks

          const drawPoints = (pts: faceapi.Point[]) => {
            for (const p of pts) {
              ctx.beginPath()
              ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
              ctx.fill()
            }
          }

          const drawCurve = (pts: faceapi.Point[]) => {
            if (pts.length < 2) return
            ctx.beginPath()
            ctx.moveTo(pts[0].x, pts[0].y)
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
            ctx.stroke()
          }

          drawCurve(lm.getJawOutline())
          drawCurve(lm.getLeftEyeBrow())
          drawCurve(lm.getRightEyeBrow())
          drawCurve(lm.getLeftEye())
          drawCurve(lm.getRightEye())
          drawCurve(lm.getNose())
          drawCurve(lm.getMouth())
          drawPoints(lm.positions)
        }

        // Use the best (highest score) detection
        const best = resized.reduce((a, b) =>
          a.detection.score > b.detection.score ? a : b
        )

        const score = best.detection.score
        const embedding = Array.from(best.descriptor) // ✅ Float32Array → number[]

        // HUD
        ctx.fillStyle = score > 0.8 ? "#22c55e" : "#f59e0b"
        ctx.font = "bold 14px Arial"
        ctx.fillText(`Confidence: ${(score * 100).toFixed(1)}%`, 10, 25)
        ctx.fillText(`Embedding: 128 points`, 10, 45)

        setEmbeddings(embedding)
        setConfidence(score)

        // Auto-complete at high confidence
        if (score > 0.8 && !completedRef.current) {
          completedRef.current = true
          stopCamera()
          if (detectionLoopRef.current) cancelAnimationFrame(detectionLoopRef.current)
          onEmbeddingComplete(embedding)
          return
        }
      } catch (err) {
        console.error("[FaceMarker] Detection error:", err)
      }

      detectionLoopRef.current = requestAnimationFrame(detect)
    }

    detect()
  }

  const handleCapture = () => {
    if (embeddings.length === 128 && !completedRef.current) {
      completedRef.current = true
      stopCamera()
      if (detectionLoopRef.current) cancelAnimationFrame(detectionLoopRef.current)
      onEmbeddingComplete(embeddings)
    }
  }

  return (
    <div className="w-full space-y-4">
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-purple-600" size={32} />
          <span className="ml-3 text-gray-600">Loading Spotix face detection models...</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Camera Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto block"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />
        </div>
      )}

      <div className="space-y-2">
        {embeddings.length === 128 && (
          <>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-900 font-semibold">Face Detected!</p>
              <p className="text-green-700 text-sm">Confidence: {(confidence * 100).toFixed(1)}%</p>
            </div>
            <button
              onClick={handleCapture}
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium transition-colors"
            >
              {isProcessing ? "Processing..." : "Confirm & Save Embedding"}
            </button>
          </>
        )}

        {embeddings.length === 0 && !loading && !error && (
          <p className="text-center text-gray-500 text-sm">
            Position your face in the camera for the model to see you. Ensure you're in a well-lit area for best results.
          </p>
        )}
      </div>
    </div>
  )
}