"use client"

/**
 * Migration Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Migrates Firestore data from the old nested structure to the new flat layout:
 *
 * EVENTS
 *   Old: events/{userId}/userEvents/{eventId}  (+ subcollections)
 *   New: events/{eventId}                      (+ same subcollections)
 *
 * TICKETS
 *   Old: TicketHistory/{userId}/tickets/{ticketId}
 *   New: tickets/{ticketId}
 *
 * Run this page once, then disable / delete it.
 * Only accessible in a server action so credentials never leave the server.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react"

// ── Sub-collection names to migrate under each event ──────────────────────
const EVENT_SUBCOLLECTIONS = [
  "attendees",
  "referrals",
  "discounts",
  "_processedTickets",
]

interface MigrationLog {
  type: "info" | "success" | "warn" | "error"
  message: string
}

interface MigrationResult {
  eventsScanned: number
  eventsMigrated: number
  eventsSkipped: number
  ticketsScanned: number
  ticketsMigrated: number
  ticketsSkipped: number
  errors: string[]
}

export default function MigrationPage() {
  const [running, setRunning] = useState(false)
  const [dryRun, setDryRun] = useState(true)
  const [logs, setLogs] = useState<MigrationLog[]>([])
  const [result, setResult] = useState<MigrationResult | null>(null)

  const addLog = (type: MigrationLog["type"], message: string) => {
    setLogs((prev) => [...prev, { type, message }])
  }

  const runMigration = async () => {
    setRunning(true)
    setLogs([])
    setResult(null)

    try {
      addLog("info", `Starting migration — dry run: ${dryRun}`)

      const res = await fetch("/api/v1/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      })

      const data = await res.json()

      if (!res.ok) {
        addLog("error", `Migration API error: ${data.error || res.statusText}`)
        return
      }

      // Stream logs from response
      if (data.logs && Array.isArray(data.logs)) {
        for (const log of data.logs) {
          addLog(log.type, log.message)
        }
      }

      setResult(data.result)
      addLog("success", "Migration complete!")
    } catch (err: any) {
      addLog("error", `Unexpected error: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  const logColor: Record<MigrationLog["type"], string> = {
    info: "text-gray-700",
    success: "text-green-700",
    warn: "text-yellow-700",
    error: "text-red-700",
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Spotix Data Migration</h1>
          <p className="text-gray-600 mb-6">
            Migrates events from{" "}
            <code className="bg-gray-100 px-1 rounded">events/&#123;userId&#125;/userEvents/&#123;eventId&#125;</code>{" "}
            → <code className="bg-gray-100 px-1 rounded">events/&#123;eventId&#125;</code>
            {" "}and tickets from{" "}
            <code className="bg-gray-100 px-1 rounded">TicketHistory/&#123;userId&#125;/tickets/&#123;ticketId&#125;</code>{" "}
            → <code className="bg-gray-100 px-1 rounded">tickets/&#123;ticketId&#125;</code>.
          </p>

          <div className="flex items-center gap-4 mb-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4"
                disabled={running}
              />
              <span className="font-medium text-gray-700">Dry run (no writes)</span>
            </label>
            {!dryRun && (
              <span className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                ⚠ LIVE MODE — writes will occur
              </span>
            )}
          </div>

          <button
            onClick={runMigration}
            disabled={running}
            className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? "Running…" : dryRun ? "Run Dry Migration" : "Run Migration"}
          </button>
        </div>

        {/* Result Summary */}
        {result && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500">Events scanned</p>
                <p className="text-2xl font-bold text-gray-900">{result.eventsScanned}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-gray-500">Events migrated</p>
                <p className="text-2xl font-bold text-green-700">{result.eventsMigrated}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4">
                <p className="text-gray-500">Events skipped</p>
                <p className="text-2xl font-bold text-yellow-700">{result.eventsSkipped}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-gray-500">Tickets scanned</p>
                <p className="text-2xl font-bold text-gray-900">{result.ticketsScanned}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-gray-500">Tickets migrated</p>
                <p className="text-2xl font-bold text-green-700">{result.ticketsMigrated}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4">
                <p className="text-gray-500">Tickets skipped</p>
                <p className="text-2xl font-bold text-yellow-700">{result.ticketsSkipped}</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-4 bg-red-50 rounded-xl p-4">
                <p className="font-semibold text-red-700 mb-2">Errors ({result.errors.length})</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-sm text-red-600">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Log Output */}
        {logs.length > 0 && (
          <div className="bg-gray-900 rounded-2xl shadow-lg p-6 font-mono text-sm max-h-[500px] overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className={`mb-1 ${logColor[log.type]} ${log.type === "error" ? "font-bold" : ""}`}>
                <span className="text-gray-500 mr-2">[{String(i).padStart(4, "0")}]</span>
                {log.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}