"use client"

import { useState } from "react"
import { ChevronRight, MessageCircle, Share2 } from "lucide-react"
import { shareOrCopy } from "@/app/lib/share"
import type { EventType } from "../page"
import { Reveal } from "./reveal"
import { SectionHeading } from "./section-heading"

interface CrewSectionProps {
  eventData: EventType
  eventUrl: string
  likeCount: number
  /** Opens the buy dialog; pass null to hide the button (sold out / ended) */
  onGetTickets: (() => void) | null
}

const chip =
  "inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#171123] transition-colors hover:border-[#171123]"

/** "Tag your crew." — invite friends via native share / WhatsApp / X, with a tilted preview card. */
export function CrewSection({ eventData, eventUrl, likeCount, onGetTickets }: CrewSectionProps) {
  const [copied, setCopied] = useState(false)

  const message = `Come with me to ${eventData.eventName}. Tickets available on Spotix!`
  const host = (() => {
    try {
      return new URL(eventUrl).host
    } catch {
      return "spotix.live"
    }
  })()

  const invite = async () => {
    const method = await shareOrCopy({ title: eventData.eventName, text: message, url: eventUrl })
    if (method === "clipboard") {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${message} ${eventUrl}`)}`
  const twitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(eventUrl)}`

  return (
    <section id="crew" className="scroll-mt-32">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <SectionHeading kicker="Come one, come all" title="Tag your" accent="squad." />
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-gray-500">
            The night gets louder when everyone&apos;s there. Send the link to your people, lock in the plan, and get your
            tickets together.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {onGetTickets && (
              <button
                type="button"
                onClick={onGetTickets}
                className="inline-flex items-center gap-2 rounded-full bg-[#171123] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6b2fa5]"
              >
                Get tickets
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={invite} className={chip}>
              <Share2 size={16} aria-hidden="true" />
              {copied ? "Link copied!" : "Invite friends"}
            </button>
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className={chip}>
              <MessageCircle size={16} aria-hidden="true" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <a href={twitter} target="_blank" rel="noopener noreferrer" aria-label="Share on X" className={chip}>
              <span aria-hidden="true" className="text-base font-black leading-none">
                𝕏
              </span>
            </a>
          </div>
        </Reveal>

        {/* Preview card */}
        <Reveal delay={120} className="relative mx-auto w-full max-w-md py-8">
          <span className="absolute -left-2 top-0 z-10 -rotate-6 rounded-2xl rounded-bl-sm bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-lg">
            Yo! Have you heard about {eventData.eventName}?
          </span>

          <div className="rotate-2 rounded-3xl border border-gray-200 bg-white p-4 shadow-[0_30px_60px_-20px_rgba(23,17,35,0.25)]">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 truncate text-xs text-gray-400">{host}</span>
            </div>
            {eventData.eventImage && (
              <img
                src={eventData.eventImage}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded-2xl bg-neutral-100 object-cover"
              />
            )}
            <p className="mt-4 truncate text-xl font-bold text-[#171123]">{eventData.eventName}</p>
            <p className="mt-1 text-sm text-gray-500">
              Tap to share{likeCount > 0 && ` · ${likeCount} ${likeCount === 1 ? "like" : "likes"}`}
            </p>
          </div>

          <span className="absolute -bottom-1 right-0 z-10 rotate-3 rounded-2xl rounded-br-sm bg-[#171123] px-4 py-2 text-sm font-bold text-white shadow-lg">
            I am so in ✅
          </span>
        </Reveal>
      </div>
    </section>
  )
}
