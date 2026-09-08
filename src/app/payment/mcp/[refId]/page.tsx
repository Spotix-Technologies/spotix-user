import type { Metadata } from "next"
import { adminDb } from "@/app/lib/firebase-admin"
import McpPaymentClient from "./McpPaymentClient"

interface PageProps {
  params: Promise<{ refId: string }>
}

// Dynamic SEO, mirroring payment/agent/page.tsx: pulls straight from the
// Reference doc so a link shared/previewed in a chat client shows real
// event/buyer context instead of a generic title.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { refId } = await params

  const fallback: Metadata = {
    title: "Complete Your Purchase | Spotix MCP",
    description: "Complete your ticket payment, started via the Spotix MCP Server.",
  }

  if (!refId) return fallback

  try {
    const doc = await adminDb.collection("Reference").doc(refId).get()
    if (!doc.exists) return fallback

    const r = doc.data()!
    if (r.channel !== "mcp") return fallback

    const title = `${r.userFullName || "Your"}'s ticket payment for ${r.eventName || "the event"}`
    const description = `Complete your ${r.totalTicketCount || 1} ${r.ticketType || "ticket"} ticket(s) purchase for ${r.eventName || "this event"}, started via the Spotix MCP Server.`

    return {
      title,
      description,
      openGraph: { title, description, type: "website" },
    }
  } catch {
    return fallback
  }
}

export default async function McpPaymentPage({ params }: PageProps) {
  const { refId } = await params
  return <McpPaymentClient refId={refId} />
}
