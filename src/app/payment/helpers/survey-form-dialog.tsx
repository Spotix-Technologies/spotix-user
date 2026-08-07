"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import EventSurveyForm from "./event-survey-form"

interface SurveyFormDialogProps {
  eventId: string
  ticketType: string
  userEmail?: string
  userFullName?: string
  isGuest?: boolean
  /** Called once the buyer has completed the form. Receives their answers. */
  onComplete: (responses: Record<string, any>, guestInfo?: { fullName: string; email: string }) => void
  /** Called when the buyer dismisses the dialog without completing the form. */
  onCancel: () => void
}

/**
 * Centered modal that hosts the event registration form.
 *
 * Opened from PaymentClient when the buyer clicks "Proceed" and the
 * selected ticket type requires a form. EventSurveyForm fires
 * onFormComplete from its "Pay Now" button's onClick once all required
 * fields are valid — we catch that here, switch to an "Opening payment
 * window" transition, and hand the responses straight back to
 * PaymentClient (synchronously, no timer) to resume the actual payment
 * flow (Paystack / free-event redirect). Keeping this hand-off inside
 * the click's own call stack matters: browsers tie a popup's "was this
 * user-initiated" check to the activation window from the triggering
 * gesture, and routing through setTimeout (even a short one) drops out
 * of that window, which is what silently blocked Paystack before. Actual
 * delivery of the responses to Firestore still only happens backend-side,
 * post payment — see spotix-backend/v1/lib/ticket/survey-delivery.js.
 */
export default function SurveyFormDialog({
  eventId,
  ticketType,
  userEmail,
  userFullName,
  isGuest = false,
  onComplete,
  onCancel,
}: SurveyFormDialogProps) {
  const [phase, setPhase] = useState<"form" | "opening">("form")

  const handleFormComplete = (
    responses: Record<string, any>,
    guestInfo?: { fullName: string; email: string }
  ) => {
    // Guard against EventSurveyForm re-firing onFormComplete (e.g. the
    // buyer edits a field again right as we're transitioning) — once
    // we've moved to the "opening" phase, this dialog is done.
    if (phase !== "form") return

    setPhase("opening")
    // Hand off immediately, in the same synchronous call stack as the
    // "Pay Now" click that triggered this. A setTimeout here — even a
    // short one — moves the Paystack handoff into a separate browser task
    // that's no longer tied to the user gesture, which is exactly what was
    // silently blocking PaystackPop.openIframe(). The "Opening payment
    // window" screen still shows via the phase change above; it just stays
    // up for however long the real async work (creating the reference,
    // loading the Paystack script) actually takes, instead of a fixed delay.
    onComplete(responses, guestInfo)
  }

  const handleFormIncomplete = () => {
    // No-op here — the dialog stays open until the buyer finishes or
    // cancels. Nothing for PaymentClient to react to mid-fill.
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] px-4 py-8"
      onClick={(e) => {
        // Click-outside-to-close, but only while still filling the form —
        // once we've moved into the "opening payment window" transition,
        // the dialog is about to hand off and shouldn't be dismissible.
        if (e.target === e.currentTarget && phase === "form") onCancel()
      }}
    >
      <style>{`
        .spotix-scroll::-webkit-scrollbar { width: 6px; }
        .spotix-scroll::-webkit-scrollbar-track { background: transparent; }
        .spotix-scroll::-webkit-scrollbar-thumb { background: #6b2fa5; border-radius: 999px; }
        .spotix-scroll::-webkit-scrollbar-thumb:hover { background: #5a2590; }
      `}</style>

      <div className="spotix-scroll bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl relative">
        {phase === "form" ? (
          <EventSurveyForm
            eventId={eventId}
            ticketType={ticketType}
            userEmail={userEmail}
            userFullName={userFullName}
            isGuest={isGuest}
            onFormComplete={handleFormComplete}
            onFormIncomplete={handleFormIncomplete}
            onClose={onCancel}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <Loader2 className="w-10 h-10 text-[#6b2fa5] animate-spin mb-5" />
            <p className="text-lg font-bold text-gray-900">Opening payment window</p>
            <p className="text-sm text-gray-500 mt-1.5">Just a moment while we get things ready…</p>
          </div>
        )}
      </div>
    </div>
  )
}
