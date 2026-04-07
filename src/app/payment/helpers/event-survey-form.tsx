"use client"

import { useState, useEffect } from "react"
import { FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { ShortTextField, LongTextField, NumberField, RadioField, CheckboxField, PhoneField, DateField, TimeField, DateTimeField } from "./survey-field-components"

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
  userEmail: string
  onFormComplete: (responses: Record<string, any>) => void
  onFormIncomplete: () => void
}

export default function EventSurveyForm({
  eventId,
  ticketType,
  userEmail,
  onFormComplete,
  onFormIncomplete,
}: EventSurveyFormProps) {
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])
  const [requiresForm, setRequiresForm] = useState(false)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)

  useEffect(() => {
    fetchSurvey()
  }, [eventId, ticketType])

  useEffect(() => {
    // Validate form whenever responses change
    if (requiresForm && questions.length > 0) {
      const isValid = validateForm(false)
      if (isValid && !hasSubmitted) {
        onFormComplete(responses)
        setHasSubmitted(true)
      } else if (!isValid && hasSubmitted) {
        onFormIncomplete()
        setHasSubmitted(false)
      }
    }
  }, [responses, requiresForm, questions])

  const fetchSurvey = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/v1/survey?eventId=${eventId}&ticketType=${encodeURIComponent(ticketType)}`,
      )
      const data = await response.json()

      if (data.success) {
        setRequiresForm(data.requiresForm)
        setQuestions(data.questions || [])

        // If no form required, immediately call onFormComplete with empty responses
        if (!data.requiresForm || data.questions.length === 0) {
          onFormComplete({})
        } else {
          // Initialize responses
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
      // On error, allow payment to proceed
      onFormComplete({})
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (showErrors: boolean = true) => {
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

    if (showErrors) {
      setErrors(newErrors)
    }

    return Object.keys(newErrors).length === 0
  }

  const handleResponseChange = (questionId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }))

    // Clear error for this field
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[questionId]
        return newErrors
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
      case "short":
        return <ShortTextField {...commonProps} />
      case "long":
        return <LongTextField {...commonProps} />
      case "number":
        return <NumberField {...commonProps} />
      case "radio":
        return <RadioField {...commonProps} question={{ ...question, options: question.options || [] }} />
      case "checkbox":
        return <CheckboxField {...commonProps} question={{ ...question, options: question.options || [] }} />
      case "phone":
        return <PhoneField {...commonProps} />
      case "date":
        return <DateField {...commonProps} />
      case "time":
        return <TimeField {...commonProps} />
      case "datetime":
        return <DateTimeField {...commonProps} />
      default:
        return <ShortTextField {...commonProps} />
    }
  }

  // Don't render anything if loading
  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm p-8">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-[#6b2fa5] animate-spin mb-4" />
          <p className="text-slate-600 text-sm">Loading event information...</p>
        </div>
      </div>
    )
  }

  // Don't render if form not required
  if (!requiresForm || questions.length === 0) {
    return null
  }

  const isFormValid = validateForm(false)

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6b2fa5] to-purple-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-lg backdrop-blur-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Event Registration Form</h3>
            <p className="text-sm text-purple-100">Please complete this form to proceed with your ticket</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-6 space-y-6">
        {/* Status Indicator */}
        {isFormValid ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">Form completed! You can now proceed with payment.</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Please complete all required fields before proceeding with payment.
            </p>
          </div>
        )}

        {/* Questions */}
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

        {/* Helper Text */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-600">
            <span className="text-red-500">*</span> Required fields
          </p>
        </div>
      </div>
    </div>
  )
}
