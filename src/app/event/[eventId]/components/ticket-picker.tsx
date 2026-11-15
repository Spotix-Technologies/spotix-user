"use client"

import { useMemo } from "react"
import type { EventType } from "../page"
import { describeSaleStatus, getTicketSaleStatus } from "@/utils/ticketSaleWindow"
import { getEventStart } from "../lib/event-datetime"
import { Reveal } from "./reveal"
import { SectionHeading } from "./section-heading"
import { TicketCard } from "./ticket-card"

interface TicketPickerProps {
  eventData: EventType
  /** Event-level reason nothing can be bought ("Sold out", "Sales ended", "Event has passed"), else null */
  eventUnavailableLabel: string | null
  onSelect: () => void
  onCheckPayment: () => void
}

/** "Pick your ticket." — one ticket-shaped card per ticket type. */
export function TicketPicker({ eventData, eventUnavailableLabel, onSelect, onCheckPayment }: TicketPickerProps) {
  const eventWideStop = useMemo(
    () => ({ enabled: !!eventData.enableStopDate, stopDate: eventData.stopDate }),
    [eventData.enableStopDate, eventData.stopDate],
  )

  const dateBadge = useMemo(() => {
    const start = getEventStart(eventData)
    if (!start) return null
    return {
      month: start.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      day: String(start.getDate()),
    }
  }, [eventData])

  // Free events may have no explicit ticket types — still show one entry card.
  const tickets = useMemo(() => {
    const list = eventData.ticketPrices ?? []
    if (list.length) return list
    return eventData.isFree ? [{ policy: "General Admission", price: 0 }] : []
  }, [eventData.ticketPrices, eventData.isFree])

  if (!tickets.length) return null

  return (
    <section id="tickets" className="scroll-mt-32">
      <Reveal>
        <SectionHeading
          kicker="Get yours"
          title="Cop your"
          accent="ticket."
          aside={
            <>
              <p>We send your ticket sharply via mail.</p>
              <p className="font-semibold text-[#171123]">Scan in at the door.</p>
            </>
          }
        />
      </Reveal>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {tickets.map((ticket, index) => {
          const saleStatus = getTicketSaleStatus(ticket, eventWideStop)
          const tierSoldOut = ticket.availableTickets === 0
          const unavailableLabel =
            eventUnavailableLabel ?? (tierSoldOut ? "Sold out" : describeSaleStatus(saleStatus))

          return (
            <Reveal key={`${ticket.policy}-${index}`} delay={index * 80}>
              <TicketCard
                policy={ticket.policy}
                description={ticket.description}
                price={Number(ticket.price) || 0}
                eventName={eventData.eventName}
                image={eventData.eventImage || eventData.eventImages?.[0] || ""}
                dateBadge={dateBadge}
                unavailableLabel={unavailableLabel}
                onSelect={onSelect}
              />
            </Reveal>
          )
        })}
      </div>

      <p className="mt-10 text-center text-sm text-gray-500">
        Already paid?{" "}
        <button
          type="button"
          onClick={onCheckPayment}
          className="font-medium text-[#6b2fa5] underline underline-offset-2 transition-colors hover:text-[#58248a]"
        >
          Check your payment status
        </button>
      </p>
    </section>
  )
}
