"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams, useParams } from "next/navigation"
import Link from "next/link"
import { Loader2, ArrowLeft } from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import PendingState         from "../components/PendingState"
import SuccessState         from "../components/SuccessState"
import FailedState          from "../components/FailedState"
import WrongTypeState       from "../components/WrongTypeState"
import IncorrectAmountState from "../components/IncorrectAmountState"

interface RefData {
  transactionType: string | null
  status:          "pending" | "success" | "failed" | "incorrect_payment" | string
  contestantId:    string | null
  contestantName:  string | null
  voteCount:       number | null
  updatedAt:       string | null
  pollId:          string | null
  pollName:        string | null
  message?:        string | null
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

/**
 * Asks the backend to actively check this reference against Paystack and
 * reconcile the Reference collection if it went through — see
 * spotix-backend/v1/verify-payment.js. Used when our own Firestore read
 * still shows "pending" (the webhook may be late or dropped). Returns
 * null on any network/config problem so the caller just falls back to
 * whatever it already has.
 */
async function reconcileWithBackend(
  ref: string
): Promise<{ reconciled: boolean; status?: string; message?: string } | null> {
  if (!BACKEND_URL) return null
  try {
    const res = await fetch(`${BACKEND_URL}/v1/verify-payment?ref=${encodeURIComponent(ref)}`)
    if (res.status === 429) return { reconciled: false } // rate limited — just fall back
    const json = await res.json()
    if (!res.ok) return null
    return { reconciled: !!json.reconciled, status: json.status, message: json.message }
  } catch {
    return null
  }
}

export default function CallbackPage() {
  const searchParams = useSearchParams()
  const params       = useParams()
  const ref          = searchParams.get("ref")
  const pollId       = params.pollId as string

  const [data,       setData]       = useState<RefData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatus = useCallback(async (isRefresh = false) => {
    if (!ref) { setError("No payment reference found in URL."); setLoading(false); return }

    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      let res = await fetch(`/api/v1/polls/verify?ref=${encodeURIComponent(ref)}`)
      let json = await res.json()

      if (!res.ok) {
        setError(json.error ?? "Failed to fetch payment status.")
        return
      }

      // Still pending on our own record? Ask the backend to actively
      // check with Paystack — the webhook may be late or never landed.
      // If it reconciled anything, re-read the now-fresh status. (Terminal
      // states — successful/failed/incorrect_payment — never re-check.)
      if (json.status !== "successful" && json.status !== "failed" && json.status !== "incorrect_payment") {
        const reconcileResult = await reconcileWithBackend(ref)
        if (reconcileResult?.reconciled) {
          res = await fetch(`/api/v1/polls/verify?ref=${encodeURIComponent(ref)}`)
          json = await res.json()
        }
      }

      setData(json)
      setError(null)
    } catch {
      setError("Network error — please check your connection and try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [ref])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#6b2fa5]" />
          <p className="text-slate-500 text-sm">Checking payment status…</p>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center text-center max-w-md mx-auto py-10">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={() => fetchStatus()}
            className="px-5 py-2.5 bg-[#6b2fa5] text-white rounded-xl text-sm font-semibold hover:bg-[#5a1f8a] transition-colors"
          >
            Retry
          </button>
        </div>
      )
    }

    if (!data) return null

    // Wrong transaction type
    if (data.transactionType && data.transactionType !== "voting_purchase") {
      return <WrongTypeState />
    }

    if (data.status === "successful") {
      return (
        <SuccessState
          contestantId={data.contestantId   ?? ""}
          contestantName={data.contestantName ?? "Unknown contestant"}
          voteCount={data.voteCount         ?? 0}
          updatedAt={data.updatedAt         ?? new Date().toISOString()}
          pollId={data.pollId               ?? pollId}
          pollName={data.pollName}
        />
      )
    }

    if (data.status === "incorrect_payment") {
      return (
        <IncorrectAmountState
          pollId={data.pollId ?? pollId}
          pollName={data.pollName}
          message={data.message}
        />
      )
    }

    if (data.status === "failed") {
      return <FailedState pollId={data.pollId ?? pollId} pollName={data.pollName} />
    }

    // Default: pending
    return <PendingState onRefresh={() => fetchStatus(true)} refreshing={refreshing} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <UserHeader />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <Link
          href={`/polls/${encodeURIComponent(pollId)}`}
          className="inline-flex items-center gap-1.5 text-sm text-[#6b2fa5] hover:text-[#5a1f8a] font-medium mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Poll
        </Link>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-10">
          {renderBody()}
        </div>
      </main>
      <Footer />
    </div>
  )
}
