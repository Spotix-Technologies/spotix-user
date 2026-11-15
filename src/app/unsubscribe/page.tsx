"use client"

/**
 * src/app/unsubscribe/page.tsx
 *
 * Public, unauthenticated page — the destination for the "Unsubscribe
 * from campaign emails" link in every campaign email (see
 * spotix-backend's v1/lib/campaigns/unsubscribe.js#createUnsubscribeUrl,
 * which points here with a signed token: /unsubscribe?token=...).
 *
 * Does the actual work by POSTing the token to the backend's
 * POST /v1/unsubscribe (JSON) — the backend verifies the HMAC-signed
 * token and marks the contact unsubscribed; every future campaign send
 * on this organizer's contacts checks that flag before sending
 * (v1/lib/campaigns/worker.js), so once this succeeds, that email
 * genuinely won't be contacted again.
 */

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { MailX, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

type Status = "loading" | "success" | "error"

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<Status>("loading")
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setError("This unsubscribe link is missing its token.")
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/v1/unsubscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || "This unsubscribe link is invalid or expired.")
        }
        setEmail(data.email || null)
        setStatus("success")
      } catch (err: any) {
        setStatus("error")
        setError(err.message || "Something went wrong — please try again later.")
      }
    })()
  }, [token])

  return (
    <main className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-10 h-10 text-[#6b2fa5] animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900">Processing your request…</h1>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">You've been unsubscribed</h1>
              <p className="text-sm text-slate-500 mt-2">
                {email ? <span className="font-medium text-slate-700">{email}</span> : "This address"} won't
                receive any more campaign emails from this organizer.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Couldn't process this link</h1>
              <p className="text-sm text-slate-500 mt-2">{error}</p>
            </>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-8">
            <MailX className="w-3.5 h-3.5" /> Spotix campaign emails
          </div>
        </div>
      </div>
    </main>
  )
}

export default function UnsubscribePage() {
  return (
    <>
      <UserHeader />
      <Suspense fallback={null}>
        <UnsubscribeContent />
      </Suspense>
      <Footer />
    </>
  )
}
