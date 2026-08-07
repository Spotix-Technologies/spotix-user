"use client"

import { useState, useEffect } from "react"
import { FileText, Loader2, CheckCircle, AlertCircle, User, Mail, X } from "lucide-react"
import {
  ShortTextField,
  LongTextField,
  NumberField,
  RadioField,
  CheckboxField,
  PhoneField,
  DateField,
  TimeField,
  DateTimeField,
} from "./survey-field-components"

interface Question {
  id: string
  questionText: string
  questionType: "short" | "long" | "number" | "radio" | "checkbox" | "phone" | "date" | "time" | "datetime"
  options?: string[]
  required: boolean
}

interface EventSurveyFormProps {
  eventId: string
  ticketType: string
  /** For logged-in users — pre-fills and hides the identity fields */
  userEmail?: string
  userFullName?: string
  /** When true, shows name + email input fields at the top of the form */
  isGuest?: boolean
  onFormComplete: (responses: Record<string, any>, guestInfo?: { fullName: string; email: string }) => void
  onFormIncomplete: () => void
  /** Optional — when supplied, shows a close (X) button in the header. Used when this form is hosted inside a dialog. */
  onClose?: () => void
}

export default function EventSurveyForm({
  eventId,
  ticketType,
  userEmail,
  userFullName,
  isGuest = false,
  onFormComplete,
  onFormIncomplete,
  onClose,
}: EventSurveyFormProps) {
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [requiresForm, setRequiresForm] = useState(false)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Tracks the click on "Pay Now" — this, not a reactive effect, is now the
  // sole trigger for handing off to payment. Keeping this state disables the
  // button after the first press so a double-click can't fire the handoff
  // twice while the parent dialog is transitioning.
  const [submitting, setSubmitting] = useState(false)

  // Guest identity fields
  const [guestName, setGuestName] = useState("")
  const [guestEmail, setGuestEmail] = useState("")
  const [guestErrors, setGuestErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchSurvey()
  }, [eventId, ticketType])

  const fetchSurvey = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/v1/survey?eventId=${eventId}&ticketType=${encodeURIComponent(ticketType)}`
      )
      const data = await response.json()

      if (data.success) {
        setRequiresForm(data.requiresForm)
        setQuestions(data.questions || [])

        if (!data.requiresForm || data.questions.length === 0) {
          // No form needed — pass through immediately
          // For guests, we still need their identity so don't fire complete yet;
          // the guest identity block below will handle it.
          if (!isGuest) {
            onFormComplete({})
          } else {
            // Guest with no survey questions — mark incomplete until they
            // fill in their name/email via the parent GuestCheckoutForm.
            // Actually: if there's no survey at all and it's a guest,
            // PaymentClient already has guestInfo from the GuestCheckoutForm step,
            // so we can fire complete with empty responses immediately.
            onFormComplete({})
          }
        } else {
          const initialResponses: Record<string, any> = {}
          data.questions.forEach((q: Question) => {
            initialResponses[q.id] = q.questionType === "checkbox" ? [] : ""
          })
          setResponses(initialResponses)
          onFormIncomplete()
        }
      }
    } catch (error) {
      console.error("Error fetching survey:", error)
      onFormComplete({})
    } finally {
      setLoading(false)
    }
  }

  const validateGuestFields = (show = true) => {
    if (!isGuest) return true
    const errs: Record<string, string> = {}
    if (!guestName.trim()) errs.name = "Name is required"
    if (!guestEmail.trim()) {
      errs.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      errs.email = "Enter a valid email"
    }
    if (show) setGuestErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateSurveyFields = (show = true) => {
    const newErrors: Record<string, string> = {}
    questions.forEach((question) => {
      if (question.required) {
        const value = responses[question.id]
        if (question.questionType === "checkbox") {
          if (!Array.isArray(value) || value.length === 0) {
            newErrors[question.id] = "Please select at least one option"
          }
        } else {
          if (!value || (typeof value === "string" && !value.trim())) {
            newErrors[question.id] = "This field is required"
          }
        }
      }
    })
    if (show) setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateAll = (show = true) => {
    return validateGuestFields(show) && validateSurveyFields(show)
  }

  const fireComplete = () => {
    if (isGuest) {
      onFormComplete(responses, { fullName: guestName, email: guestEmail })
    } else {
      onFormComplete(responses)
    }
  }

  // Wired directly to the "Pay Now" button's onClick. This is the actual
  // user gesture now — everything downstream (SurveyFormDialog -> 
  // PaymentClient -> PayWithPaystack) is called synchronously from this
  // handler rather than from a reactive effect or timer, so the browser's
  // user-activation window stays intact all the way to PaystackPop.openIframe().
  const handlePayNowClick = () => {
    if (submitting) return
    const isValid = validateAll(true)
    if (!isValid) {
      onFormIncomplete()
      return
    }
    setSubmitting(true)
    fireComplete()
  }

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }))
    if (errors[questionId]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[questionId]
        return next
      })
    }
  }

  const renderQuestion = (question: Question) => {
    const commonProps = {
      question,
      value: responses[question.id],
      onChange: (value: any) => handleResponseChange(question.id, value),
      error: errors[question.id],
    }
    switch (question.questionType) {
      case "short":    return <ShortTextField {...commonProps} />
      case "long":     return <LongTextField {...commonProps} />
      case "number":   return <NumberField {...commonProps} />
      case "radio":    return <RadioField {...commonProps} question={{ ...question, options: question.options || [] }} />
      case "checkbox": return <CheckboxField {...commonProps} question={{ ...question, options: question.options || [] }} />
      case "phone":    return <PhoneField {...commonProps} />
      case "date":     return <DateField {...commonProps} />
      case "time":     return <TimeField {...commonProps} />
      case "datetime": return <DateTimeField {...commonProps} />
      default:         return <ShortTextField {...commonProps} />
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Close form"
          >
            <X size={18} />
          </button>
        )}
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-[#6b2fa5] animate-spin mb-4" />
          <p className="text-slate-600 text-sm">Loading event information...</p>
        </div>
      </div>
    )
  }

  // No survey required AND not guest — nothing to show
  if (!requiresForm && !isGuest) return null

  // No survey required AND guest — also nothing to show (GuestCheckoutForm handles identity)
  if (!requiresForm && isGuest) return null

  const isFormValid = validateAll(false)

  return (
    <div className="bg-white rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6b2fa5] to-purple-600 px-6 py-4 sticky top-0 z-[1]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white">Event Registration Form</h3>
              <p className="text-sm text-purple-100">Please complete this form to proceed with your ticket</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors flex-shrink-0"
              aria-label="Close form"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status indicator */}
        {isFormValid ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">Form completed! You can now proceed with payment.</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">Please complete all required fields before proceeding.</p>
          </div>
        )}

        {/* ── Guest identity fields ─────────────────────────────────── */}
        {isGuest && (
          <div className="space-y-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Your Details</p>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => {
                    setGuestName(e.target.value)
                    if (guestErrors.name) setGuestErrors((p) => { const n = { ...p }; delete n.name; return n })
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-lg border-2 text-sm text-gray-900 outline-none transition-all ${
                    guestErrors.name
                      ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-100"
                      : "border-gray-200 bg-white focus:border-[#6b2fa5] focus:ring-2 focus:ring-purple-100"
                  }`}
                  placeholder="John Doe"
                />
              </div>
              {guestErrors.name && <p className="text-red-500 text-xs mt-1">{guestErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => {
                    setGuestEmail(e.target.value)
                    if (guestErrors.email) setGuestErrors((p) => { const n = { ...p }; delete n.email; return n })
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-lg border-2 text-sm text-gray-900 outline-none transition-all ${
                    guestErrors.email
                      ? "border-red-400 bg-red-50 focus:ring-2 focus:ring-red-100"
                      : "border-gray-200 bg-white focus:border-[#6b2fa5] focus:ring-2 focus:ring-purple-100"
                  }`}
                  placeholder="john@example.com"
                />
              </div>
              {guestErrors.email && <p className="text-red-500 text-xs mt-1">{guestErrors.email}</p>}
            </div>
          </div>
        )}

        {/* ── Survey questions ──────────────────────────────────────── */}
        {questions.length > 0 && (
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div key={question.id} className="pb-6 border-b border-slate-200 last:border-0">
                <div className="mb-3">
                  <span className="text-xs font-semibold text-[#6b2fa5] bg-[#6b2fa5]/10 px-2.5 py-1 rounded-full">
                    Question {index + 1} of {questions.length}
                  </span>
                </div>
                {renderQuestion(question)}
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            <span className="text-red-500">*</span> Required fields
          </p>
        </div>

        {/* ── Pay Now ───────────────────────────────────────────────────
            This is the real click that kicks off payment. Previously the
            form auto-submitted from a useEffect the moment validation
            passed, and the parent dialog then handed off to Paystack via
            a bare setTimeout — neither of those is a genuine user gesture,
            so browsers silently blocked PaystackPop.openIframe(). Routing
            everything through this button's onClick keeps the whole chain
            inside the click's activation window. */}
        <button
          type="button"
          onClick={handlePayNowClick}
          disabled={!isFormValid || submitting}
          className={`w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2 ${
            isFormValid && !submitting
              ? "bg-gradient-to-r from-[#6b2fa5] to-purple-600 hover:from-[#5a2590] hover:to-purple-700 shadow-lg shadow-purple-200 cursor-pointer"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Pay Now"
          )}
        </button>
      </div>
    </div>
  )
}