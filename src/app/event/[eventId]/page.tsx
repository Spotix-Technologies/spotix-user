import ClientPage from "./ClientPage"
import type { Metadata } from "next"
import { adminDb } from "@/app/lib/firebase-admin"
import { PhoneCall, Mail, ShieldOff } from "lucide-react"

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
  organizerId?: string
  allowAgents?: boolean
  suspended?: boolean
}

async function fetchEventData(eventId: string): Promise<EventType | null> {
  try {
    const eventDoc = await adminDb.collection("events").doc(eventId).get()
    if (!eventDoc.exists) return null
    const d = eventDoc.data()
    const organizerId = d?.organizerId || d?.createdBy || ""
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
      createdBy: organizerId,
      organizerId: organizerId,
      allowAgents: d?.allowAgents || false,
      suspended: d?.suspended || false,
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
    if (eventData.suspended) {
      return {
        title: `${eventData.eventName} - Suspended | Spotix`,
        description: "This event has been suspended.",
      }
    }
    const eventDescription = eventData.eventDescription
      ? eventData.eventDescription.substring(0, 160)
      : `Join us for ${eventData.eventName} on ${new Date(eventData.eventDate).toLocaleDateString()}. ${
          eventData.isFree ? "Free event" : "Tickets available now"
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

// ── Suspension screen (purple Spotix theme) ───────────────────────────────────

function SuspendedPage({ eventData }: { eventData: EventType }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden">

        {/* Header bar */}
        <div
          className="px-6 py-6 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, #6b2fa5 0%, #4c1d73 100%)" }}
        >
          <div className="w-14 h-14 bg-white bg-opacity-15 rounded-2xl flex items-center justify-center flex-shrink-0">
            <ShieldOff size={28} className="text-white" />
          </div>
          <div>
            <p className="text-purple-200 text-xs font-semibold uppercase tracking-widest mb-1">
              Event Suspended
            </p>
            <h1 className="text-white font-bold text-xl leading-tight">
              {eventData.eventName}
            </h1>
          </div>
        </div>

        {/* Spotix logo strip */}
        <div className="px-6 py-3 bg-purple-50 border-b border-purple-100 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#6b2fa5]" />
          <span className="text-xs font-semibold text-[#6b2fa5] tracking-wide uppercase">
            Spotix Platform Notice
          </span>
        </div>

        {/* Body */}
        <div className="px-6 py-7 space-y-5">
          <p className="text-gray-700 text-base leading-relaxed">
            <span className="font-semibold text-gray-900">{eventData.eventName}</span> has been
            suspended by the Spotix platform and is currently unavailable for ticket purchases
            or registrations.
          </p>

          {(eventData.bookerEmail || eventData.bookerPhone) && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-800">
                Already purchased a ticket? Contact the event organizer:
              </p>

              {eventData.bookerEmail && (
                <a
                  href={`mailto:${eventData.bookerEmail}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#6b2fa5] bg-opacity-10 group-hover:bg-opacity-20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Mail size={16} className="text-[#6b2fa5]" />
                  </div>
                  <span className="text-sm font-medium text-[#6b2fa5] group-hover:text-purple-800 transition-colors break-all">
                    {eventData.bookerEmail}
                  </span>
                </a>
              )}

              {eventData.bookerPhone && (
                <a
                  href={`tel:${eventData.bookerPhone}`}
                  className="flex items-center gap-3 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#6b2fa5] bg-opacity-10 group-hover:bg-opacity-20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <PhoneCall size={16} className="text-[#6b2fa5]" />
                  </div>
                  <span className="text-sm font-medium text-[#6b2fa5] group-hover:text-purple-800 transition-colors">
                    {eventData.bookerPhone}
                  </span>
                </a>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400 leading-relaxed pt-1">
            For further assistance you may also contact Spotix support. We apologise for any
            inconvenience caused.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EventPage({
  params,
}: {
  params: Promise<{ createdBy: string; eventId: string }>
}) {
  const { createdBy, eventId } = await params
  const eventData = await fetchEventData(eventId)

  if (eventData?.suspended) {
    return <SuspendedPage eventData={eventData} />
  }

  return <ClientPage params={{ createdBy, eventId }} initialEventData={eventData} />
}
