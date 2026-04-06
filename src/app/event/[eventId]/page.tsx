import ClientPage from "./ClientPage"
import type { Metadata } from "next"
import { adminDb } from "@/app/lib/firebase-admin"

export interface EventType {
  id: string
  eventName: string
  eventImage: string
  eventImages: string[]
  eventDate: string
  eventEndDate: string
  eventStart: string
  eventEnd: string
  eventType: string
  isFree: boolean
  ticketPrices: { policy: string; price: number }[]
  bookerName: string
  bookerEmail?: string
  bookerPhone?: string
  isVerified?: boolean
  eventDescription?: string
  eventVenue: string
  colorCode?: string
  enableColorCode?: boolean
  enableMaxSize?: boolean
  maxSize?: string
  enableStopDate?: boolean
  stopDate?: string
  ticketsSold?: number
  likeCount: number
  createdBy: string
  allowAgents?: boolean
}

async function fetchEventData(eventId: string): Promise<EventType | null> {
  try {
    // Flat structure: events/{eventId}
    const eventDoc = await adminDb.collection("events").doc(eventId).get()

    if (!eventDoc.exists) return null

    const d = eventDoc.data()

    return {
      id: eventDoc.id,
      eventName: d?.eventName || "",
      eventImage: d?.eventImage || "",
      eventImages: d?.eventImages || [],
      eventDate: d?.eventDate || "",
      eventEndDate: d?.eventEndDate || "",
      eventStart: d?.eventStart || "",
      eventEnd: d?.eventEnd || "",
      eventType: d?.eventType || "",
      isFree: d?.isFree || false,
      ticketPrices: d?.ticketPrices || [],
      bookerName: d?.bookerName || "",
      bookerEmail: d?.bookerEmail,
      bookerPhone: d?.bookerPhone,
      isVerified: d?.isVerified || false,
      eventDescription: d?.eventDescription,
      eventVenue: d?.eventVenue || "",
      colorCode: d?.colorCode,
      enableColorCode: d?.enableColorCode || false,
      enableMaxSize: d?.enableMaxSize || false,
      maxSize: d?.maxSize,
      enableStopDate: d?.enableStopDate || false,
      stopDate: d?.stopDate,
      ticketsSold: d?.ticketsSold || 0,
      likeCount: d?.likeCount || 0,
      createdBy: d?.organizerId || "",
      allowAgents: d?.allowAgents || false,
    }
  } catch (error) {
    console.error("Error fetching event data:", error)
    return null
  }
}


export async function generateMetadata({
  params,
}: {
  params: Promise<{ createdBy: string; eventId: string }>
}): Promise<Metadata> {
  try {
    const { eventId } = await params

    if (!eventId) {
      return {
        title: "Event Not Found - Spotix",
        description: "The event you're looking for doesn't exist or has been removed.",
      }
    }

    const eventData = await fetchEventData(eventId)

    if (!eventData) {
      return {
        title: "Event Not Found - Spotix",
        description: "The event you're looking for doesn't exist or has been removed.",
      }
    }

    const eventDescription = eventData.eventDescription
      ? eventData.eventDescription.substring(0, 160)
      : `Join us for ${eventData.eventName} on ${new Date(eventData.eventDate).toLocaleDateString()}. ${eventData.isFree ? "Free event" : "Tickets available now"
      }!`

    const imageUrl =
      eventData.eventImage ||
      `${process.env.NEXT_PUBLIC_BASE_URL || "https://spotix.vercel.app"}/placeholder.svg`

    return {
      title: `${eventData.eventName} - Spotix`,
      description: eventDescription,
      keywords: `${eventData.eventName}, ${eventData.eventType}, ${eventData.eventVenue}, events, tickets, spotix`,
      authors: [{ name: eventData.bookerName }],
      openGraph: {
        title: eventData.eventName,
        description: eventDescription,
        images: [{ url: imageUrl, width: 1200, height: 630, alt: eventData.eventName }],
        type: "website",
        siteName: "Spotix",
        locale: "en_US",
      },
      twitter: {
        card: "summary_large_image",
        title: eventData.eventName,
        description: eventDescription,
        images: [imageUrl],
        site: "@spotix",
        creator: "@spotix",
      },
      other: {
        "event:start_time": new Date(eventData.eventDate).toISOString(),
        "event:end_time": eventData.eventEndDate
          ? new Date(eventData.eventEndDate).toISOString()
          : "",
        "event:location": eventData.eventVenue,
        "event:price": eventData.isFree ? "Free" : "Paid",
      },
    }
  } catch (error) {
    console.error("Error generating metadata:", error)
    return {
      title: "Event - Spotix",
      description: "Discover amazing events on Spotix",
    }
  }
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ createdBy: string; eventId: string }>
}) {
  const { createdBy, eventId } = await params

  // SSR fetch — no createdBy needed anymore (flat path)
  const eventData = await fetchEventData(eventId)

  // console.log("Fetched event data for SSR:", eventData)

  return <ClientPage params={{ createdBy, eventId }} initialEventData={eventData} />
}