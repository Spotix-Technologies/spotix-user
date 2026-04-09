"use client"

import { useState, useEffect, useRef } from "react"
import { X, Search, ChevronDown, Gift, Loader2, AlertTriangle } from "lucide-react"

interface GiftTicketProps {
  isOpen: boolean
  ticketId: string
  onClose: () => void
  onSuccess: (newTicketId: string) => void
}

type SpotixUserChoice = "yes" | "no" | null
type Step = "user-check" | "form" | "confirm"

const GIFT_REASONS = [
  "It's their birthday 🎂",
  "I am not going again for this event",
  "It's a give away 🎁",
  "A 'just because' gift 💜",
]

export default function GiftTicket({ isOpen, ticketId, onClose, onSuccess }: GiftTicketProps) {
  const [step, setStep] = useState<Step>("user-check")
  const [isSpotixUser, setIsSpotixUser] = useState<SpotixUserChoice>(null)

  // Form fields
  const [gifteeEmail, setGifteeEmail] = useState("")
  const [gifteeName, setGifteeName] = useState("")
  const [gifteePhone, setGifteePhone] = useState("")
  const [giftNote, setGiftNote] = useState("")
  const [giftReason, setGiftReason] = useState("")

  // UI state
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [reasonOpen, setReasonOpen] = useState(false)
  const [understood, setUnderstood] = useState(false)
  const [isGifting, setIsGifting] = useState(false)
  const [giftError, setGiftError] = useState<string | null>(null)

  const sheetRef = useRef<HTMLDivElement>(null)

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep("user-check")
        setIsSpotixUser(null)
        setGifteeEmail("")
        setGifteeName("")
        setGifteePhone("")
        setGiftNote("")
        setGiftReason("")
        setEmailVerified(false)
        setVerifyError(null)
        setGiftError(null)
        setUnderstood(false)
        setReasonOpen(false)
      }, 400)
    }
  }, [isOpen])

  const handleVerifyEmail = async () => {
    if (!gifteeEmail || !/\S+@\S+\.\S+/.test(gifteeEmail)) {
      setVerifyError("Please enter a valid email address")
      return
    }
    setIsVerifying(true)
    setVerifyError(null)
    setEmailVerified(false)

    try {
      const res = await fetch(
        `/api/v1/ticket/${ticketId}/share?email=${encodeURIComponent(gifteeEmail)}`
      )
      const data = await res.json()
      if (!res.ok) {
        setVerifyError(data.message || "Verification failed")
        return
      }
      if (!data.found) {
        setVerifyError("No Spotix account found with this email. Try the manual option.")
        return
      }
      setGifteeName(data.fullName || "")
      setGifteePhone(data.phoneNumber || "")
      setEmailVerified(true)
    } catch {
      setVerifyError("Network error. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleGift = async () => {
    setIsGifting(true)
    setGiftError(null)
    try {
      const res = await fetch(`/api/v1/ticket/${ticketId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gifteeEmail,
          gifteeName,
          gifteePhone,
          giftNote,
          giftReason,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGiftError(data.message || "Failed to gift ticket")
        setStep("form")
        return
      }
      onSuccess(data.newTicketId)
      onClose()
    } catch {
      setGiftError("Network error. Please try again.")
      setStep("form")
    } finally {
      setIsGifting(false)
    }
  }

  // For Spotix users: email must be verified
  // For non-Spotix users: email just needs to be a valid format
  const isFormReady =
    (isSpotixUser === "yes" ? emailVerified : !!gifteeEmail.trim() && /\S+@\S+\.\S+/.test(gifteeEmail)) &&
    gifteeName.trim() &&
    gifteePhone.trim() &&
    giftReason

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl
          transition-transform duration-500 ease-out max-h-[92dvh] flex flex-col
          ${isOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ maxWidth: "640px", margin: "0 auto" }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <X size={15} className="text-gray-600" />
        </button>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 pb-8">

          {/* Hero image */}
          <div className="flex justify-center mt-2 mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/share_ticket.svg"
              alt="Gift a ticket"
              className="w-24 h-24 object-contain"
            />
          </div>

          {/* Heading */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              Spread Joy, One Ticket at a Time
            </h2>
            <p className="text-sm text-gray-500 mt-1.5">
              Send this ticket as a gift. They'll love you for it.
            </p>
          </div>

          {/* ── STEP: User choice ─────────────────────────────────────────── */}
          {step === "user-check" && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5">
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  Does the recipient have a Spotix account?
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  If they do, we'll auto-fill their name and phone number from their profile.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setIsSpotixUser("yes"); setStep("form") }}
                  className="py-3.5 rounded-2xl border-2 border-purple-600 bg-white text-purple-700 font-semibold text-sm hover:bg-purple-50 transition-colors"
                >
                  Yes, they do 👋
                </button>
                <button
                  onClick={() => { setIsSpotixUser("no"); setStep("form") }}
                  className="py-3.5 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  No / Not sure
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: Form ────────────────────────────────────────────────── */}
          {step === "form" && (
            <div className="space-y-4">

              {/* Giftee Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Giftee's Email *
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={gifteeEmail}
                    onChange={(e) => {
                      setGifteeEmail(e.target.value)
                      setEmailVerified(false)
                      setVerifyError(null)
                      // Clear auto-filled fields if Spotix user changes email
                      if (isSpotixUser === "yes") {
                        setGifteeName("")
                        setGifteePhone("")
                      }
                    }}
                    placeholder="their@email.com"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                  {/* Verify button only for Spotix users */}
                  {isSpotixUser === "yes" && (
                    <button
                      onClick={handleVerifyEmail}
                      disabled={isVerifying || !gifteeEmail}
                      className="px-4 py-3 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {isVerifying
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Search size={14} />}
                      Verify
                    </button>
                  )}
                </div>
                {verifyError && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={11} /> {verifyError}
                  </p>
                )}
                {isSpotixUser === "yes" && emailVerified && (
                  <p className="text-xs text-green-600 mt-1.5 font-medium">
                    ✓ Account found — details filled automatically
                  </p>
                )}
              </div>

              {/* Giftee Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Giftee's Full Name *
                </label>
                <input
                  type="text"
                  value={gifteeName}
                  onChange={(e) => setGifteeName(e.target.value)}
                  readOnly={isSpotixUser === "yes" && emailVerified}
                  placeholder="Their full name"
                  className={`w-full px-4 py-3 rounded-xl border text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition
                    ${isSpotixUser === "yes" && emailVerified
                      ? "border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed"
                      : "border-gray-200 text-gray-800 bg-white"}`}
                />
              </div>

              {/* Giftee Phone */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Giftee's Phone Number *
                </label>
                <input
                  type="tel"
                  value={gifteePhone}
                  onChange={(e) => setGifteePhone(e.target.value)}
                  readOnly={isSpotixUser === "yes" && emailVerified}
                  placeholder="+234..."
                  className={`w-full px-4 py-3 rounded-xl border text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition
                    ${isSpotixUser === "yes" && emailVerified
                      ? "border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed"
                      : "border-gray-200 text-gray-800 bg-white"}`}
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Personal Note <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={giftNote}
                  onChange={(e) => setGiftNote(e.target.value)}
                  placeholder="Add a sweet message for your giftee..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition resize-none"
                />
              </div>

              {/* Reason Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Reason for Gifting *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setReasonOpen((p) => !p)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  >
                    <span className={giftReason ? "text-gray-800" : "text-gray-400"}>
                      {giftReason || "Select a reason..."}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-gray-400 transition-transform ${reasonOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {reasonOpen && (
                    <div className="absolute inset-x-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
                      {GIFT_REASONS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => { setGiftReason(r); setReasonOpen(false) }}
                          className={`w-full text-left px-4 py-3 text-sm hover:bg-purple-50 transition-colors
                            ${giftReason === r ? "text-purple-700 font-semibold bg-purple-50" : "text-gray-700"}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Proceed button — unlocks when form is complete */}
              {isFormReady && (
                <button
                  onClick={() => setStep("confirm")}
                  className="w-full py-3.5 bg-purple-600 text-white rounded-2xl font-bold text-sm hover:bg-purple-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-200 mt-2"
                >
                  <Gift size={17} />
                  Gift This Ticket
                </button>
              )}

              {giftError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 flex items-start gap-2">
                  <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                  {giftError}
                </div>
              )}
            </div>
          )}

          {/* ── STEP: Confirm ─────────────────────────────────────────────── */}
          {step === "confirm" && (
            <div className="space-y-5">

              {/* Warning box */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle size={15} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-800 mb-1">
                      Please read before confirming
                    </p>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      After gifting, <strong>you will no longer be able to use this ticket</strong> to check in to the event. This action is permanent and cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="border-t border-amber-200 pt-3">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    🚫 <strong>Spotix does not support illegal ticket reselling.</strong> We actively monitor for suspicious gifting activity and will revoke tickets involved in such activities. Gifting should only be done for genuine reasons.
                  </p>
                </div>
              </div>

              {/* Gift summary */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Gifting to</p>
                <p className="text-sm font-bold text-gray-900">{gifteeName}</p>
                <p className="text-xs text-gray-500">{gifteeEmail} · {gifteePhone}</p>
                <p className="text-xs text-gray-500 italic mt-1">"{giftReason}"</p>
                {giftNote && (
                  <p className="text-xs text-gray-400 mt-1 border-t border-gray-200 pt-2">"{giftNote}"</p>
                )}
              </div>

              {/* Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={understood}
                    onChange={(e) => setUnderstood(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0
                      ${understood
                        ? "bg-[#6b2fa5] border-[#6b2fa5]"
                        : "border-gray-300 bg-white group-hover:border-purple-400"}`}
                  >
                    {understood && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-700 leading-relaxed">
                  I understand that this ticket will be permanently transferred and I cannot use it to check in anymore.
                </span>
              </label>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleGift}
                  disabled={!understood || isGifting}
                  className="flex-1 py-3 bg-[#6b2fa5] text-white rounded-2xl font-bold text-sm hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-purple-200"
                >
                  {isGifting ? (
                    <><Loader2 size={15} className="animate-spin" /> Gifting...</>
                  ) : (
                    <><Gift size={15} /> Confirm Gift</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
