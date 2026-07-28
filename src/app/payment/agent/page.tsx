import type { Metadata } from "next"
import { adminDb } from "@/app/lib/firebase-admin"
import AgentPaymentClient from "./AgentPaymentClient"

interface PageProps {
  searchParams: Promise<{ refId?: string }>
}

// ── Dynamic SEO per instruction 9 ────────────────────────────────────────────
// Title: "{buyerFullName}'s ticket payment for {EventName}"
// Description: "{AgentName} has prepared a transaction for {qty} {ticketType}
//               ticket(s) for {eventName}. Click to pay."
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { refId } = await searchParams

  const fallback: Metadata = {
    title: "Ticket Payment | Spotix",
    description: "Complete your ticket payment on Spotix.",
  }

  if (!refId) return fallback

  try {
    const doc = await adminDb.collection("Reference").doc(refId).get()
    if (!doc.exists) return fallback

    const r = doc.data()!
    if (!r.isAgentSale) return fallback

    const title = `${r.userFullName || "Your"}'s ticket payment for ${r.eventName || "the event"}`
    const description = `${r.agentName || "Your agent"} has prepared a transaction for ${r.totalTicketCount || 1} ${r.ticketType || "ticket"} ticket(s) for ${r.eventName || "this event"}. Click to pay.`

    return {
      title,
      description,
      openGraph: { title, description, type: "website" },
    }
  } catch {
    return fallback
  }
}

export default async function AgentPaymentPage({ searchParams }: PageProps) {
  const { refId } = await searchParams
  return <AgentPaymentClient refId={refId ?? null} />
}
