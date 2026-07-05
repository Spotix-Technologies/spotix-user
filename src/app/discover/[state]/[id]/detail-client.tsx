"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  MapPin, Calendar, Clock, User, Tag, ExternalLink,
  AlertTriangle, X, Loader2, ChevronLeft, Shield, Info,
} from "lucide-react"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"

interface TicketTier {
  label: string
  price: string
}

interface DiscoverEvent {
  id: string; state: string; eventName: string; description: string
  host: string; location: string; genre: string; eventStart: string
  eventEnd: string | null; ticketPolicy: string; ticketTiers: TicketTier[] | null
  isSpotixEvent: boolean
  spotixEventId: string | null; ticketLink: string | null
  imageUrl: string; postedBy: string; createdAt: string
}

// ── Take-Down Dialog ─────────────────────────────────────────────────────────
function TakeDownDialog({
  open, onClose, eventId, state,
}: {
  open: boolean; onClose: () => void; eventId: string; state: string
}) {
  const [reason, setReason] = useState("")

  if (!open) return null

  const handleSubmit = () => {
    if (!reason.trim()) return
    const message = encodeURIComponent(
      `Hello Spotix,\n\nI would like to request the removal of my event from your discovery listing.\n\nReason: ${reason}\n\nEvent Discovery ID: ${eventId}\nEvent State: ${state}\n\nThank you.`
    )
    window.open(`https://wa.me/2348123927685?text=${message}`, "_blank", "noopener,noreferrer")
    onClose()
  }

  return (
   <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center p-4" style={{ top: "72px" }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Remove your event from our Listing</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5 transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            The Spotix discovery system aggregates events from across Nigeria to help organizers create
            awareness entirely free of charge. For events not sold on Spotix, we collect no fees
            whatsoever and have no commercial interest in your listing. That said, we respect your
            ownership of your event and will remove it from our public listings promptly upon your request.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1 text-xs text-gray-500 font-mono">
            <p>Discovery ID: <span className="text-gray-700 font-semibold">{eventId}</span></p>
            <p>State: <span className="text-gray-700 font-semibold">{state}</span></p>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1.5">
              Reason for removal <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please tell us why you'd like this listing removed…"
              rows={4}
              className="w-full text-sm text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5] placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold border-2 border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Send via WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Get Tickets Dialog ────────────────────────────────────────────────────────
function GetTicketsDialog({
  open, onClose, ticketLink,
}: {
  open: boolean; onClose: () => void; ticketLink: string
}) {
  if (!open) return null

  const handleProceed = () => {
    const separator = ticketLink.includes("?") ? "&" : "?"
    window.open(`${ticketLink}${separator}referrer=spotix.com.ng`, "_blank", "noopener,noreferrer")
    onClose()
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center p-4" style={{ top: "72px" }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="font-bold text-lg text-gray-900">You're leaving Spotix</h3>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            We don't sell tickets for this particular event — we're simply creating awareness about it.
            You'll be taken to the event organizer's ticketing page.
          </p>
        </div>
        <div className="px-6 pb-6 pt-4 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold border-2 border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            Go back
          </button>
          <button onClick={handleProceed}
            className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white transition-colors"
            style={{ backgroundColor: "#6b2fa5" }}>
            OK, got it
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DiscoverDetailClient({ state, id }: { state: string; id: string }) {
  const router = useRouter()
  const [event, setEvent] = useState<DiscoverEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTakeDown, setShowTakeDown] = useState(false)
  const [showGetTickets, setShowGetTickets] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/v1/discover/${encodeURIComponent(state)}/${id}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Event not found")
        setEvent(json.event)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load event")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [state, id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserHeader />
        <div className="flex items-center justify-center py-32">
          <div className="text-center space-y-3">
            <Loader2 className="w-7 h-7 animate-spin mx-auto" style={{ color: "#6b2fa5" }} />
            <p className="text-sm text-gray-500">Loading event…</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserHeader />
        <div className="flex flex-col items-center justify-center py-32 gap-4 text-center px-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-gray-600 font-medium">{error || "Event not found"}</p>
          <button onClick={() => router.push("/discover")}
            className="px-6 py-2 text-sm font-semibold rounded-xl text-white"
            style={{ backgroundColor: "#6b2fa5" }}>
            Back to Discover
          </button>
        </div>
        <Footer />
      </div>
    )
  }

  const start = new Date(event.eventStart)
  const end = event.eventEnd ? new Date(event.eventEnd) : null

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })

  return (
    <div className="min-h-screen bg-gray-50">
      <UserHeader />

      {/* Hero image */}
      <div className="relative h-64 md:h-96 overflow-hidden bg-gray-900">
        {event.imageUrl && (
          <img src={event.imageUrl} alt={event.eventName} className="w-full h-full object-cover opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <button
          onClick={() => router.push("/discover")}
          className="absolute top-4 left-4 flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-medium rounded-full px-3 py-1.5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Discover
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
          <div className="max-w-4xl mx-auto">
            {event.genre && (
              <span className="inline-block px-3 py-1 text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-full mb-3">
                {event.genre}
              </span>
            )}
            <h1 className="text-2xl md:text-4xl font-extrabold text-white leading-tight drop-shadow">
              {event.eventName}
            </h1>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Affiliation banner */}
        {event.isSpotixEvent ? (
          <div className="flex items-start gap-3 p-4 rounded-xl border"
            style={{ backgroundColor: "#6b2fa5" + "15", borderColor: "#6b2fa5" + "40" }}>
            <Shield className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#6b2fa5" }} />
            <div>
              <p className="text-sm font-bold" style={{ color: "#6b2fa5" }}>Sold on Spotix</p>
              <p className="text-xs text-gray-600 mt-0.5">The tickets for this event are sold on Spotix.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">Listing Only. This event is Not Affiliated with Spotix</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Spotix is just listing this event and is NOT affiliated with this event.
                We are not responsible for ticket sales, pricing, or event management.
              </p>
            </div>
            <button
              onClick={() => setShowTakeDown(true)}
              className="shrink-0 text-xs font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
            >
              Take Down
            </button>
          </div>
        )}

        {/* Main card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 space-y-4">

            {/* Date & time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#6b2fa5" + "15" }}>
                  <Calendar className="w-5 h-5" style={{ color: "#6b2fa5" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{fmtDate(start)}</p>
                  {end && <p className="text-xs text-gray-500 mt-0.5">to {fmtDate(end)}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#6b2fa5" + "15" }}>
                  <Clock className="w-5 h-5" style={{ color: "#6b2fa5" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{fmtTime(start)}</p>
                  {end && <p className="text-xs text-gray-500 mt-0.5">ends {fmtTime(end)}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#6b2fa5" + "15" }}>
                  <MapPin className="w-5 h-5" style={{ color: "#6b2fa5" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{event.location || event.state}</p>
                  {event.location && <p className="text-xs text-gray-500 mt-0.5">{event.state}</p>}
                </div>
              </div>

              {event.host && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "#6b2fa5" + "15" }}>
                    <User className="w-5 h-5" style={{ color: "#6b2fa5" }} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Host</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{event.host}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Ticket policy */}
            <div className="pt-1 space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400" />
                {event.ticketPolicy === "free" ? (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">Free Event</span>
                ) : event.ticketPolicy === "listed" && event.ticketTiers && event.ticketTiers.length > 0 ? (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#6b2fa5]/10 text-[#6b2fa5]">
                    {event.ticketTiers.length === 1 ? "Paid Event" : `${event.ticketTiers.length} Ticket Tiers`}
                  </span>
                ) : (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                    {event.ticketPolicy === "tbd" ? "Tickets: Pricing TBD" : "Paid Event"}
                  </span>
                )}
              </div>

              {event.ticketPolicy === "listed" && event.ticketTiers && event.ticketTiers.length > 0 && (
                <div className="rounded-xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                  {event.ticketTiers.map((tier, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-gray-50/50">
                      <span className="text-sm text-gray-700">{tier.label || `Tier ${i + 1}`}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {tier.price ? `₦${Number(tier.price).toLocaleString("en-NG")}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">About</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{event.description}</p>
              </div>
            )}
          </div>

          {/* CTA footer */}
          <div className="px-5 md:px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            {event.isSpotixEvent && event.spotixEventId ? (
              <button
                onClick={() => router.push(`/event/${event.spotixEventId}`)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl text-white shadow-lg transition-all hover:opacity-90"
                style={{ backgroundColor: "#6b2fa5", boxShadow: "0 4px 16px #6b2fa530" }}
              >
                Get Tickets on Spotix
              </button>
            ) : event.ticketLink ? (
              <button
                onClick={() => setShowGetTickets(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#6b2fa5" }}
              >
                <ExternalLink className="w-4 h-4" />
                Get Tickets
              </button>
            ) : (
              <p className="flex-1 text-center text-sm text-gray-400 py-3">
                Ticket link not available yet — check back soon.
              </p>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Posted on Spotix Discover by {event.postedBy} ·{" "}
          {new Date(event.createdAt).toLocaleDateString("en-NG")}
        </p>
      </main>

      <Footer />

      <TakeDownDialog
        open={showTakeDown}
        onClose={() => setShowTakeDown(false)}
        eventId={id}
        state={state}
      />
      <GetTicketsDialog
        open={showGetTickets}
        onClose={() => setShowGetTickets(false)}
        ticketLink={event.ticketLink || ""}
      />
    </div>
  )
}
