"use client"

import React, { useEffect, useRef, useState } from "react"
import { CalendarDays, Settings } from "lucide-react"

interface ViewSettingsProps {
  calendarView: boolean
  onCalendarViewChange: (on: boolean) => void
}

/** Small "Settings" popover for the home page. Holds the Calendar view switch. */
const ViewSettings: React.FC<ViewSettingsProps> = ({ calendarView, onCalendarViewChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", onDown)
    document.addEventListener("touchstart", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("touchstart", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-900"
      >
        <Settings size={16} aria-hidden="true" />
        Settings
        {calendarView && <span className="h-1.5 w-1.5 rounded-full bg-[#6b2fa5]" aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Home settings"
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#6b2fa5]/10 text-[#6b2fa5]">
              <CalendarDays size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p id="calendar-view-label" className="text-sm font-semibold text-gray-900">
                Calendar view
              </p>
              <p className="mt-0.5 text-xs text-gray-500">See events laid out by day on a monthly calendar.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={calendarView}
              aria-labelledby="calendar-view-label"
              onClick={() => onCalendarViewChange(!calendarView)}
              className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${
                calendarView ? "bg-[#6b2fa5]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  calendarView ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ViewSettings
