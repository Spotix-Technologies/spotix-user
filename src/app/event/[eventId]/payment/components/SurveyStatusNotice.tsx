"use client"

import { FileText } from "lucide-react"

interface SurveyStatusNoticeProps {
  isSurveyComplete: boolean
}

export default function SurveyStatusNotice({ isSurveyComplete }: SurveyStatusNoticeProps) {
  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 flex items-start gap-3">
      <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-blue-900">
          {isSurveyComplete ? "Registration form completed" : "This event requires a short form"}
        </p>
        <p className="text-xs text-blue-700 mt-0.5">
          {isSurveyComplete
            ? "Your answers were saved. You're all set to continue."
            : "You'll be asked to fill it in when you continue below."}
        </p>
      </div>
    </div>
  )
}
