import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Long-running migration — extend timeout as much as the platform allows
export const maxDuration = 300

/**
 * POST /api/migrate
 * Body: { dryRun: boolean }
 *
 * Migrates:
 *   events/{userId}/userEvents/{eventId} → events/{eventId}
 *   (subcollections: attendees, referrals, discounts, _processedTickets)
 *
 *   TicketHistory/{userId}/tickets/{ticketId} → tickets/{ticketId}
 */

const EVENT_SUBCOLLECTIONS = [
  "attendees",
  "referrals",
  "discounts",
  "_processedTickets",
]

type LogType = "info" | "success" | "warn" | "error"
interface LogEntry { type: LogType; message: string }

export async function POST(req: NextRequest) {
  const { dryRun = true } = await req.json().catch(() => ({}))

  const logs: LogEntry[] = []
  const errors: string[] = []
  const result = {
    eventsScanned: 0,
    eventsMigrated: 0,
    eventsSkipped: 0,
    ticketsScanned: 0,
    ticketsMigrated: 0,
    ticketsSkipped: 0,
    errors,
  }

  const log = (type: LogType, message: string) => {
    logs.push({ type, message })
    console.log(`[migrate][${type}] ${message}`)
  }

  try {
    log("info", `Migration started — dryRun: ${dryRun}`)

    // ═══════════════════════════════════════════════════════════════
    // PART 1 — Events
    // Old: events/{userId}/userEvents/{eventId}
    // New: events/{eventId}
    // ═══════════════════════════════════════════════════════════════
    log("info", "─── Part 1: Migrating events ───")

    // Each top-level doc in `events` is a userId (old structure)
    // New flat docs won't have a `userEvents` subcollection, so we can
    // distinguish them by checking for that subcollection's existence.
    const topLevelEventsSnap = await adminDb.collection("events").listDocuments()
    log("info", `Found ${topLevelEventsSnap.length} top-level docs in events/`)

    for (const userDocRef of topLevelEventsSnap) {
      const userId = userDocRef.id

      // Check if this doc has a userEvents subcollection
      const userEventsSnap = await adminDb
        .collection("events")
        .doc(userId)
        .collection("userEvents")
        .listDocuments()

      if (userEventsSnap.length === 0) {
        log("info", `  events/${userId} — no userEvents subcollection, skipping (already flat or empty)`)
        continue
      }

      log("info", `  events/${userId} — found ${userEventsSnap.length} event(s) to migrate`)

      for (const oldEventRef of userEventsSnap) {
        const eventId = oldEventRef.id
        result.eventsScanned++

        try {
          // Check if target doc already exists
          const newEventRef = adminDb.collection("events").doc(eventId)
          const newEventSnap = await newEventRef.get()

          if (newEventSnap.exists) {
            log("warn", `    events/${eventId} already exists — skipping main doc (will still check subcollections)`)
            result.eventsSkipped++
          } else {
            // Copy main event document fields
            const oldEventSnap = await oldEventRef.get()
            if (!oldEventSnap.exists) {
              log("warn", `    events/${userId}/userEvents/${eventId} — source doc missing, skipping`)
              result.eventsSkipped++
              continue
            }

            const eventData = oldEventSnap.data()!
            // Inject organizerId if not already present
            const migratedData = {
              ...eventData,
              organizerId: eventData.organizerId || userId,
              _migratedAt: new Date().toISOString(),
              _migratedFrom: `events/${userId}/userEvents/${eventId}`,
            }

            if (!dryRun) {
              await newEventRef.set(migratedData)
            }
            log("success", `    [${dryRun ? "DRY" : "WRITE"}] events/${eventId} — main doc migrated`)
            result.eventsMigrated++
          }

          // ── Subcollections ──────────────────────────────────────
          for (const subName of EVENT_SUBCOLLECTIONS) {
            const oldSubSnap = await adminDb
              .collection("events")
              .doc(userId)
              .collection("userEvents")
              .doc(eventId)
              .collection(subName)
              .get()

            if (oldSubSnap.empty) continue

            log("info", `      ${subName}: ${oldSubSnap.size} doc(s)`)

            for (const subDoc of oldSubSnap.docs) {
              const newSubRef = adminDb
                .collection("events")
                .doc(eventId)
                .collection(subName)
                .doc(subDoc.id)

              const newSubSnap = await newSubRef.get()
              if (newSubSnap.exists) {
                log("info", `        ${subName}/${subDoc.id} already exists — skipping`)
                continue
              }

              if (!dryRun) {
                await newSubRef.set(subDoc.data())
              }
              log("success", `        [${dryRun ? "DRY" : "WRITE"}] ${subName}/${subDoc.id} migrated`)
            }
          }
        } catch (eventError: any) {
          const msg = `Error migrating events/${userId}/userEvents/${eventId}: ${eventError.message}`
          log("error", msg)
          errors.push(msg)
        }
      }
    }

    log("info", `Part 1 complete — scanned: ${result.eventsScanned}, migrated: ${result.eventsMigrated}, skipped: ${result.eventsSkipped}`)

    // ═══════════════════════════════════════════════════════════════
    // PART 2 — Tickets
    // Old: TicketHistory/{userId}/tickets/{ticketId}
    // New: tickets/{ticketId}
    // ═══════════════════════════════════════════════════════════════
    log("info", "─── Part 2: Migrating tickets ───")

    const ticketHistoryDocs = await adminDb.collection("TicketHistory").listDocuments()
    log("info", `Found ${ticketHistoryDocs.length} user doc(s) in TicketHistory/`)

    for (const userTicketRef of ticketHistoryDocs) {
      const userId = userTicketRef.id

      const oldTicketsSnap = await adminDb
        .collection("TicketHistory")
        .doc(userId)
        .collection("tickets")
        .get()

      if (oldTicketsSnap.empty) {
        log("info", `  TicketHistory/${userId} — no tickets subcollection, skipping`)
        continue
      }

      log("info", `  TicketHistory/${userId} — ${oldTicketsSnap.size} ticket(s)`)

      for (const oldTicketDoc of oldTicketsSnap.docs) {
        const ticketId = oldTicketDoc.id
        result.ticketsScanned++

        try {
          const newTicketRef = adminDb.collection("tickets").doc(ticketId)
          const newTicketSnap = await newTicketRef.get()

          if (newTicketSnap.exists) {
            log("info", `    tickets/${ticketId} already exists — skipping`)
            result.ticketsSkipped++
            continue
          }

          const ticketData = oldTicketDoc.data()
          const migratedTicket = {
            ...ticketData,
            // Ensure uid is set — for old tickets this was the Firestore userId path segment
            uid: ticketData.uid || userId,
            isGuest: ticketData.isGuest || false,
            _migratedAt: new Date().toISOString(),
            _migratedFrom: `TicketHistory/${userId}/tickets/${ticketId}`,
          }

          if (!dryRun) {
            await newTicketRef.set(migratedTicket)
          }
          log("success", `    [${dryRun ? "DRY" : "WRITE"}] tickets/${ticketId} migrated`)
          result.ticketsMigrated++
        } catch (ticketError: any) {
          const msg = `Error migrating TicketHistory/${userId}/tickets/${ticketId}: ${ticketError.message}`
          log("error", msg)
          errors.push(msg)
        }
      }
    }

    log("info", `Part 2 complete — scanned: ${result.ticketsScanned}, migrated: ${result.ticketsMigrated}, skipped: ${result.ticketsSkipped}`)
    log(errors.length === 0 ? "success" : "warn", `Migration finished with ${errors.length} error(s)`)

    return NextResponse.json({ logs, result }, { status: 200 })
  } catch (err: any) {
    log("error", `Fatal migration error: ${err.message}`)
    return NextResponse.json({ logs, result, error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "POST to this endpoint with { dryRun: boolean } to run the migration" },
    { status: 200 }
  )
}