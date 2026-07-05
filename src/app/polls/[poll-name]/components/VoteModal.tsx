"use client"

import { useState, useEffect, useRef } from "react"
import { X, User, Mail, Phone, Hash, Loader2 } from "lucide-react"
import type { ContestantData, VoteData, CategoryData } from "@/app/lib/voting-utils"

interface VoteModalProps {
  contestant: ContestantData
  pollData: VoteData
  voteId: string
  userId: string | null | undefined
  onClose: () => void
  categoryId?: string          // only for group polls
  categoryPrice?: number       // per-category price
}

export function VoteModal({
  contestant,
  pollData,
  voteId,
  userId,
  onClose,
  categoryId,
  categoryPrice,
}: VoteModalProps) {
  const isGuest    = !userId
  const priceToUse = categoryPrice ?? pollData.pollPrice

  const [step, setStep]       = useState<"details" | "count" | "paying">(isGuest ? "details" : "count")
  const [name,  setName]      = useState("")
  const [email, setEmail]     = useState("")
  const [phone, setPhone]     = useState("")
  const [voteCount, setVoteCount]   = useState(1)
  const [errors,    setErrors]      = useState<string[]>([])
  const [loading,   setLoading]     = useState(false)

  const paystackHandlerRef = useRef<any>(null)

  // Compute the actual amount the buyer pays
  // If buyerBearsBurden=true → buyer pays price + 5%; if false → buyer just pays price
  const buyerBearsBurden = pollData.buyerBearsBurden ?? true
  const baseAmount       = priceToUse * voteCount
  const serviceFee       = buyerBearsBurden ? Math.round(baseAmount * 0.05) : 0
  const totalAmount      = baseAmount + serviceFee

  // Preload Paystack inline.js
  useEffect(() => {
    if (document.getElementById("paystack-js-voting")) return
    const s = document.createElement("script")
    s.id    = "paystack-js-voting"
    s.src   = "https://js.paystack.co/v1/inline.js"
    s.async = true
    document.body.appendChild(s)
  }, [])

  const validateDetails = () => {
    const e: string[] = []
    if (!name.trim())  e.push("Full name is required")
    if (!email.trim()) e.push("Email address is required")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.push("Enter a valid email address")
    setErrors(e)
    return e.length === 0
  }

  const getIdToken = async (): Promise<string | null> => {
    try {
      const { auth } = await import("@/app/lib/firebase")
      return auth.currentUser ? await auth.currentUser.getIdToken() : null
    } catch { return null }
  }

  const handleProceedToPayment = async () => {
    if (voteCount < 1) { setErrors(["Vote count must be at least 1"]); return }
    setLoading(true)
    setErrors([])

    try {
      const token = userId ? await getIdToken() : null

      const refRes = await fetch("/api/v1/vote/payref", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          pollId:         voteId,
          creatorId:      pollData.creatorId,
          contestantId:   contestant.contestantId,
          contestantName: contestant.name,
          pollPrice:      priceToUse,
          voteCount,
          totalAmount,
          pollName:       pollData.pollName,
          userId:         userId ?? null,
          categoryId:     categoryId ?? null,
          buyerBearsBurden,
          serviceFee,
          guestName:      isGuest ? name  : null,
          guestEmail:     isGuest ? email : null,
          guestPhone:     isGuest ? (phone || null) : null,
        }),
      })

      const refData = await refRes.json()
      if (!refRes.ok) {
        setErrors([refData.error || "Failed to initialise payment"])
        setLoading(false)
        return
      }

      const { reference, payerEmail, payerName, payerPhone } = refData

      const resolvedEmail = payerEmail || email || ""
      const resolvedName  = payerName  || name  || ""
      const resolvedPhone = payerPhone || phone  || ""

      const nameParts  = resolvedName.trim().split(/\s+/)
      const firstName  = nameParts[0] ?? ""
      const lastName   = nameParts.slice(1).join(" ") || firstName

      const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
      if (!paystackKey) {
        setErrors(["Payment configuration error. Please contact support."])
        setLoading(false)
        return
      }

      setStep("paying")
      setLoading(false)

      setTimeout(() => {
        const PS = (window as any).PaystackPop
        if (!PS) {
          setErrors(["Payment SDK not loaded. Please refresh and try again."])
          setStep(isGuest ? "count" : "count")
          return
        }

        const handler = PS.setup({
          key:        paystackKey,
          email:      resolvedEmail,
          amount:     Math.round(totalAmount * 100),
          currency:   "NGN",
          ref:        reference,
          first_name: firstName,
          last_name:  lastName,
          phone:      resolvedPhone,
          metadata: {
            custom_fields: [
              { display_name: "Transaction Type", variable_name: "type",             value: "voting_purchase" },
              { display_name: "Full Name",        variable_name: "full_name",        value: resolvedName  },
              { display_name: "Phone",            variable_name: "phone_number",     value: resolvedPhone },
              { display_name: "Poll",             variable_name: "poll_name",        value: pollData.pollName },
              { display_name: "Contestant",       variable_name: "contestant_name",  value: contestant.name },
              { display_name: "Vote Count",       variable_name: "vote_count",       value: String(voteCount) },
              { display_name: "Poll ID",          variable_name: "poll_id",          value: voteId },
              { display_name: "Organizer ID",     variable_name: "organizer_id",     value: pollData.creatorId },
              { display_name: "Contestant ID",    variable_name: "contestant_id",    value: contestant.contestantId },
              ...(categoryId ? [{ display_name: "Category ID", variable_name: "category_id", value: categoryId }] : []),
            ],
          },
          callback: (response: { reference: string }) => {
            window.location.href = `/polls/${voteId}/callback?ref=${response.reference}`
          },
          onClose: () => { setStep(isGuest ? "details" : "count") },
        })

        paystackHandlerRef.current = handler
        if (typeof handler?.openIframe === "function")  handler.openIframe()
        else if (typeof handler?.pay === "function")    handler.pay()
        else setErrors(["Could not open payment window. Please refresh and try again."])
      }, 100)

    } catch {
      setErrors(["An unexpected error occurred. Please try again."])
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center bg-black/50 sm:pt-20 pt-[72px]">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl" style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] p-5 relative flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white pr-10">Vote for {contestant.name}</h2>
          <p className="text-white/70 text-sm mt-0.5">₦{priceToUse.toLocaleString()} per vote</p>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "calc(90vh - 100px)" }}>
          <div className="p-5 space-y-4">

            {errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                {errors.map((e, i) => <p key={i} className="text-sm text-red-700">• {e}</p>)}
              </div>
            )}

            {step === "paying" && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-[#6b2fa5]" />
                <p className="text-sm text-gray-500">Opening payment window…</p>
              </div>
            )}

            {/* Guest details step */}
            {step === "details" && (
              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-sm font-semibold text-yellow-900">You&apos;re not logged in</p>
                  <p className="text-xs text-yellow-700 mt-0.5">Fill in your details to vote as a guest.</p>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                    <User className="w-3.5 h-3.5" /> Full Name *
                  </label>
                  <input type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#6b2fa5] focus:ring-2 focus:ring-[#6b2fa5]/20" />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                    <Mail className="w-3.5 h-3.5" /> Email Address *
                  </label>
                  <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#6b2fa5] focus:ring-2 focus:ring-[#6b2fa5]/20" />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1">
                    <Phone className="w-3.5 h-3.5" /> Phone <span className="text-gray-400">(optional)</span>
                  </label>
                  <input type="tel" placeholder="08012345678" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-black placeholder:text-gray-400 focus:outline-none focus:border-[#6b2fa5] focus:ring-2 focus:ring-[#6b2fa5]/20" />
                </div>

                <button onClick={() => { if (validateDetails()) { setStep("count"); setErrors([]) } }}
                  className="w-full py-3 bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all">
                  Continue →
                </button>
              </div>
            )}

            {/* Vote count step */}
            {step === "count" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <img src={contestant.image || "/placeholder.svg"} alt={contestant.name}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900">{contestant.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{contestant.contestantId}</p>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-2">
                    <Hash className="w-3.5 h-3.5" /> Number of Votes
                  </label>
                  <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => setVoteCount(Math.max(1, voteCount - 1))}
                      className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-xl text-gray-700 transition-colors flex-shrink-0 flex items-center justify-center">
                      −
                    </button>
                    <input type="number" min="1" value={voteCount}
                      onChange={(e) => setVoteCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-center text-xl font-bold text-black focus:outline-none focus:border-[#6b2fa5]" />
                    <button onClick={() => setVoteCount(voteCount + 1)}
                      className="w-11 h-11 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-xl text-gray-700 transition-colors flex-shrink-0 flex items-center justify-center">
                      +
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 5, 10, 25, 50].map((n) => (
                      <button key={n} onClick={() => setVoteCount(n)}
                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all
                          ${voteCount === n ? "bg-[#6b2fa5] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="p-3 bg-[#6b2fa5]/5 border border-[#6b2fa5]/20 rounded-xl">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Price per vote</span>
                    <span className="font-medium text-gray-900">₦{priceToUse.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">× Votes</span>
                    <span className="font-medium text-gray-900">{voteCount}</span>
                  </div>
                  {buyerBearsBurden && serviceFee > 0 && (
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Service fee (5%)</span>
                      <span className="font-medium text-orange-600">+₦{serviceFee.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-[#6b2fa5]/20 pt-2">
                    <span className="text-gray-800">Total</span>
                    <span className="text-[#6b2fa5] text-lg">₦{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {isGuest && (
                    <button onClick={() => { setErrors([]); setStep("details") }}
                      className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
                      Back
                    </button>
                  )}
                  <button onClick={handleProceedToPayment} disabled={loading}
                    className="flex-1 py-3 bg-gradient-to-r from-[#6b2fa5] to-[#9333ea] text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                      : "Pay & Vote →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
