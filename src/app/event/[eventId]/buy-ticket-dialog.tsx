"use client"

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { X, Plus, Minus, ShoppingCart, Clock, AlertTriangle, Loader2 } from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import { calculateVATFee, resolvePlatformFeeRates, computeOrderPricing, type OrderPricingBreakdown } from "@/utils/priceUtility"
import { getTicketSaleStatus, describeSaleStatus, type TicketSaleWindowFields } from "@/utils/ticketSaleWindow"
import type { EventType } from "./page"

interface CartItem {
  ticketType: string
  policy: string
  price: number
  quantity: number
  vat: number
}

interface TicketPrice extends TicketSaleWindowFields {
  policy: string
  price: number
  description?: string
  availableTickets?: number
  ticketsSold?: number
}

interface BuyTicketDrawerProps {
  eventData: EventType
  isEventToday: boolean
  isEventPassed: boolean
  isSoldOut: boolean
  isSaleEnded: boolean
  onBuyTicket: (cart: CartItem[]) => void
  onClose: () => void
  onShowPassedDialog?: () => void
}


// ── Helpers ───────────────────────────────────────────────────────────────────

/** True if eventDate+eventStart has already passed right now */
function hasEventStarted(eventDate: string, eventStart?: string): boolean {
  if (!eventDate) return false
  const dateStr = eventStart ? `${eventDate}T${eventStart}` : `${eventDate}T00:00`
  return new Date() >= new Date(dateStr)
}


/** True if the stopDate datetime has passed */
function hasSaleStopped(stopDate?: string): boolean {
  if (!stopDate) return false
  return new Date() >= new Date(stopDate)
}

/** True if stopDate is still in the future but falls on today's calendar date */
function isSaleStoppingToday(stopDate?: string): boolean {
  if (!stopDate) return false
  const stop = new Date(stopDate)
  const now = new Date()
  return (
    stop.getFullYear() === now.getFullYear() &&
    stop.getMonth() === now.getMonth() &&
    stop.getDate() === now.getDate() &&
    stop > now
  )
}

/**
 * Remaining tickets for a tier, or null if unlimited sale.
 *
 * A tier is only ever "sold out" when availableTickets is explicitly the
 * number 0. Anything else that isn't a genuine, finite, non-negative number —
 * missing entirely, null, an empty string, or a malformed value — is treated
 * as unlimited sale rather than being coerced into a false 0.
 */
function getRemaining(ticket: TicketPrice | null | undefined): number | null {
  if (!ticket) return null
  const raw = ticket.availableTickets
  if (raw === undefined || raw === null || (raw as unknown as string) === "") return null
  const num = Number(raw)
  if (!Number.isFinite(num)) return null
  // availableTickets IS the remaining count — the backend decrements it on each purchase
  return Math.max(0, num)
}

// ── Free event sold-out check ──────────────────────────────────────────────────
function getFreeEventSoldOut(eventData: EventType): boolean {
  if (!eventData.isFree) return false
  if (!eventData.enableMaxSize || !eventData.maxSize) return false
  return (eventData.ticketsSold || 0) >= parseInt(String(eventData.maxSize))
}

/** Max tickets a user can add for a free event in one order */
const FREE_EVENT_MAX_QTY = 10

function getFreeEventMaxQty(eventData: EventType): number {
  if (!eventData.enableMaxSize || !eventData.maxSize) return FREE_EVENT_MAX_QTY
  const remaining = parseInt(String(eventData.maxSize)) - (eventData.ticketsSold || 0)
  return Math.min(FREE_EVENT_MAX_QTY, Math.max(0, remaining))
}

// ── Drawer / card helpers ─────────────────────────────────────────────────────

/** Slide duration — keep in sync with the `duration-300` classes in the render below */
const DRAWER_ANIM_MS = 300

/**
 * Small, cacheable version of the event image for use as a card backdrop.
 * Cloudinary URLs get a resized/auto-format transform (same pattern as the navbar search
 * thumbnails); anything else is used as-is.
 */
function getCardBackdrop(url: string): string {
  if (!url) return ""
  if (url.includes("cloudinary.com")) {
    const uploadIndex = url.indexOf("/upload/")
    if (uploadIndex !== -1) {
      const beforeUpload = url.substring(0, uploadIndex + 8)
      const afterUpload = url.substring(uploadIndex + 8)
      return `${beforeUpload}c_fill,w_700,q_auto,f_auto/${afterUpload}`
    }
  }
  return url
}

/**
 * A ticket card: the event's main image as the background, softly blurred, with a dark
 * overlay so the white text on top always has contrast. The solid dark base underneath
 * means the card still reads correctly if the image is missing or fails to load.
 */
function TicketCardShell({
  image,
  state,
  children,
}: {
  image: string
  state: "default" | "selected" | "disabled"
  children: React.ReactNode
}) {
  const disabled = state === "disabled"
  return (
    <div
      className={`relative isolate overflow-hidden rounded-2xl border bg-[#171123] transition-all ${
        state === "selected"
          ? "border-[#c4a0ee] ring-2 ring-[#6b2fa5]/70 shadow-lg shadow-purple-900/30"
          : "border-white/10"
      }`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 -z-20 h-full w-full scale-110 object-cover blur-[3px] ${
            disabled ? "grayscale" : ""
          }`}
        />
      ) : (
        <div className="absolute inset-0 -z-20 bg-gradient-to-br from-[#2e1449] to-[#171123]" />
      )}
      {/* Dark overlay for text legibility */}
      <div
        className={`absolute inset-0 -z-10 bg-gradient-to-br ${
          disabled
            ? "from-[#0d0818]/90 via-[#0d0818]/85 to-[#0d0818]/90"
            : "from-[#0d0818]/72 via-[#0d0818]/58 to-[#0d0818]/74"
        }`}
      />
      <div className={`relative ${disabled ? "opacity-75" : ""}`}>{children}</div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

const BuyTicketDrawer: React.FC<BuyTicketDrawerProps> = ({
  eventData,
  isEventToday,
  isEventPassed,
  isSoldOut,
  isSaleEnded,
  onBuyTicket,
  onClose,
}) => {
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  // Free event quantity (separate counter, single ticket type)
  const [freeQty, setFreeQty] = useState(1)
  // True while we've handed off to onBuyTicket and the payment/registration page is loading
  const [isProceeding, setIsProceeding] = useState(false)

  // ── Drawer open/close animation ───────────────────────────────────────────
  // The parent mounts this component to open it and unmounts it on `onClose`, so the slide-out
  // is handled here: flip `open` off, let the transition play, then tell the parent.
  const [open, setOpen] = useState(false)
  const closingRef = useRef(false)
  const closeTimerRef = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Slide in on the frame after mount so the closed → open transition actually plays
  useEffect(() => {
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setOpen(true)
        panelRef.current?.focus({ preventScroll: true })
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [])

  const handleClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setOpen(false)
    closeTimerRef.current = window.setTimeout(onClose, DRAWER_ANIM_MS)
  }, [onClose])

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    },
    []
  )

  // Escape closes the drawer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [handleClose])

  // ── Sale status (computed once on mount) ─────────────────────────────────

  const eventStarted = useMemo(
    () => hasEventStarted(eventData.eventDate, eventData.eventStart),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const activeStopDate =
    eventData.enableStopDate && eventData.stopDate ? eventData.stopDate : undefined

  // Per-ticket-type sale window fallback target — passed into
  // getTicketSaleStatus for every tier below.
  const eventWideStop = { enabled: !!eventData.enableStopDate, stopDate: eventData.stopDate }

  // Main event image → backdrop for every ticket card (falls back to the first gallery image)
  const cardImage = getCardBackdrop(eventData.eventImage || eventData.eventImages?.[0] || "")

  const stopDatePassed = useMemo(
    () => hasSaleStopped(activeStopDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const stopDateIsToday = useMemo(
    () => isSaleStoppingToday(activeStopDate),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // stopDate (when enabled) overrides the legacy isSaleEnded / isEventPassed props
  const effectivelyClosed =
    isEventPassed || isSoldOut || isSaleEnded || eventStarted || stopDatePassed

  // Free event specific checks
  const freeEventSoldOut = getFreeEventSoldOut(eventData)
  const freeEventMaxQty = getFreeEventMaxQty(eventData)
  const freeEventEffectivelyClosed = effectivelyClosed || freeEventSoldOut

  /** Max tickets a user can add per ticket type in one order (paid events) */
const MAX_QTY_PER_TYPE = 10

// ── Quantity controls (paid events) ──────────────────────────────────────

  const increment = (index: number) => {
    const ticket = (eventData.ticketPrices ?? [])[index] as TicketPrice
    const remaining = getRemaining(ticket)
    const current = quantities[index] ?? 0
    if (current >= MAX_QTY_PER_TYPE) return                      // 10-ticket cap
    if (remaining !== null && current >= remaining) return        // availability cap
    if (!getTicketSaleStatus(ticket, eventWideStop).onSale) return // per-ticket sale window
    setQuantities((prev) => ({ ...prev, [index]: current + 1 }))
  }

  const decrement = (index: number) => {
    setQuantities((prev) => {
      const current = prev[index] ?? 0
      if (current <= 1) {
        const { [index]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [index]: current - 1 }
    })
  }

  // ── Free event quantity controls ──────────────────────────────────────────

  const incrementFree = () => {
    if (freeQty >= freeEventMaxQty) return
    setFreeQty((q) => q + 1)
  }

  const decrementFree = () => {
    setFreeQty((q) => Math.max(1, q - 1))
  }

  // ── Platform fee rates for this event (admin-configurable — see
  // resolvePlatformFeeRates for the exact fallback rules) ──────────────────
  const feeRates = useMemo(() => resolvePlatformFeeRates(eventData), [eventData])

  // Whether the attendee owes any fee at all under this event's current
  // Burden of Fee setting — used purely to decide whether to show the
  // "+ VAT & Fees computed at checkout" hint per ticket tier below. The
  // exact amount is never shown here since it depends on the whole cart
  // (Paystack's fee especially is computed on the full transaction, not
  // per ticket) — see computeOrderPricing / orderPricing below for that.
  const buyerOwesAnyFee = !eventData.feeBurden?.coversSpotixFee || !eventData.feeBurden?.coversPaystackFee

  // ── Cart (paid events) ────────────────────────────────────────────────────

  const cartItems: CartItem[] = (eventData.ticketPrices ?? [])
    .map((ticket, index) => {
      const qty = quantities[index] ?? 0
      if (qty === 0) return null
      const t = ticket as TicketPrice
      // Defense in depth — a tier's sale window can lapse while the dialog
      // is open (e.g. sitting on the page past its stop time); don't let a
      // stale quantity slip into the order.
      if (!getTicketSaleStatus(t, eventWideStop).onSale) return null
      const price = Number(t.price) || 0
      return {
        ticketType: t.policy,
        policy: t.policy,
        price,
        quantity: qty,
        vat: calculateVATFee(price, feeRates),
      }
    })
    .filter((item): item is CartItem => item !== null)

  const totalTickets = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalVat = cartItems.reduce((sum, i) => sum + i.vat * i.quantity, 0)

  // ── Order-level pricing: Spotix's fee, Paystack's fee, and addons all
  // resolved together against this event's Burden of Fee setting — the
  // single source of truth every checkout surface (this dialog, the
  // payment page, create-pay-ref) computes from. See computeOrderPricing.
  //
  // Only `showFeeBreakdown` is used here — this dialog shows the raw ticket
  // subtotal and defers the actual fee-inclusive total to the payment page,
  // matching the "VAT & Fees — Computed at checkout" copy below. Don't wire
  // orderPricing.totalPayable into the footer total here; that's what
  // caused it to show a fee-inclusive number while still claiming fees are
  // "computed at checkout".
  const orderPricing: OrderPricingBreakdown = useMemo(
    () =>
      computeOrderPricing({
        ticketSubtotal: subtotal,
        totalTicketCount: totalTickets,
        spotixFeeTotal: totalVat,
        feeBurden: eventData.feeBurden,
        addons: eventData.addons,
      }),
    [subtotal, totalTickets, totalVat, eventData.feeBurden, eventData.addons]
  )
  // Whenever the organizer covers less than everything, show a breakdown
  // so it's always clear what the buyer is actually paying for.
  const showFeeBreakdown = orderPricing.buyerOwesSpotixFee || orderPricing.buyerOwesPaystackFee || orderPricing.addonFeeTotal > 0

  // ── Proceed handlers ──────────────────────────────────────────────────────

  const handleProceed = () => {
    if (cartItems.length === 0) {
      alert("Please select at least one ticket")
      return
    }
    if (isProceeding) return
    setIsProceeding(true)
    if (typeof window !== "undefined") {
      localStorage.setItem("spotix_cart", JSON.stringify(cartItems))
    }
    onBuyTicket(cartItems)
  }

  const handleFreeProceed = () => {
    if (freeQty < 1) return
    if (isProceeding) return
    setIsProceeding(true)
    const freeCartItems: CartItem[] = [
      {
        ticketType: "Free Admission",
        policy: "Free Admission",
        price: 0,
        quantity: freeQty,
        vat: 0,
      },
    ]
    if (typeof window !== "undefined") {
      localStorage.setItem("spotix_cart", JSON.stringify(freeCartItems))
    }
    onBuyTicket(freeCartItems)
  }

  
  // Closed button label
  const closedLabel =
    isEventPassed || eventStarted ? "Event Ended" : "Sales Closed"

  // ── Render ────────────────────────────────────────────────────────────────
  //
  // z-[1100]: the site header is sticky at z-index 1000 (components/header.styled.tsx), so the
  // drawer has to sit above it or the header covers the top of the panel.
  //
  // Bottom sheet on mobile, right-hand side drawer from `md` up. Header and footer stay
  // pinned; only the middle (banners + ticket cards) scrolls.

  return (
    <div className="fixed inset-0 z-[1100]">
      <style>{`
        .spotix-scroll::-webkit-scrollbar { width: 6px; }
        .spotix-scroll::-webkit-scrollbar-track { background: transparent; }
        .spotix-scroll::-webkit-scrollbar-thumb { background: #6b2fa5; border-radius: 999px; }
        .spotix-scroll::-webkit-scrollbar-thumb:hover { background: #5a2590; }
      `}</style>

      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Select tickets for ${eventData.eventName}`}
        tabIndex={-1}
        className={`absolute bottom-0 left-0 right-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-white shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none md:bottom-0 md:left-auto md:right-0 md:top-0 md:max-h-none md:w-[460px] md:rounded-l-3xl md:rounded-tr-none ${
          open
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full"
        }`}
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between rounded-t-3xl border-b border-gray-200 bg-white p-5 md:rounded-tr-none md:rounded-tl-3xl">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900">Select Tickets</h2>
            <p className="mt-0.5 truncate text-sm text-gray-500">{eventData.eventName}</p>
          </div>
          <button
            onClick={handleClose}
            className="ml-3 shrink-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close drawer"
          >
            <X size={22} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="spotix-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">

          {/* ── Status banners ── */}
          <div className="space-y-2 px-5 pt-4">

            {/* Event started / passed */}
            {(isEventPassed || eventStarted) && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                <AlertTriangle size={15} className="flex-shrink-0" />
                {isEventPassed
                  ? "This event has already occurred. Ticket sales are closed."
                  : "This event has already started. Ticket sales are closed."}
              </div>
            )}

            {/* Sold out (whole event) */}
            {isSoldOut && !isEventPassed && !eventStarted && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                <AlertTriangle size={15} className="flex-shrink-0" />
                This event is sold out.
              </div>
            )}

            {/* Free event sold out */}
            {eventData.isFree && freeEventSoldOut && !isSoldOut && !isEventPassed && !eventStarted && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                <AlertTriangle size={15} className="flex-shrink-0" />
                This event is sold out.
              </div>
            )}

            {/* Stop date has passed */}
            {stopDatePassed && !isEventPassed && !eventStarted && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                <AlertTriangle size={15} className="flex-shrink-0" />
                Ticket sales for this event have ended.
              </div>
            )}

            {/* Legacy isSaleEnded fallback */}
            {isSaleEnded && !stopDatePassed && !isEventPassed && !eventStarted && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm font-medium">
                <AlertTriangle size={15} className="flex-shrink-0" />
                Ticket sales for this event have ended.
              </div>
            )}

            {/* Sale stopping TODAY */}
            {stopDateIsToday && !effectivelyClosed && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl text-sm font-semibold">
                <Clock size={15} className="flex-shrink-0 text-amber-600" />
                Ticket sales stop <span className="text-amber-900 mx-1">Today!</span> Cop yours now!
              </div>
            )}

            {/* Event is today, hasn't started yet */}
            {isEventToday && !eventStarted && !effectivelyClosed && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 text-[#6b2fa5] rounded-xl text-sm font-semibold">
                <span className="text-base leading-none">🔥</span>
                Event is Today! Grab your ticket before it starts.
              </div>
            )}
          </div>

          {/* ── Ticket list ── */}
          <div className="space-y-3 p-5">
            {eventData.isFree ? (
              /* ── Free event: quantity picker ── */
              <TicketCardShell
                image={cardImage}
                state={freeEventEffectivelyClosed ? "disabled" : "selected"}
              >
                <div className="flex items-start justify-between gap-4 p-4">
                  {/* Left: ticket info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold leading-tight text-white">
                        Free Admission
                      </p>
                      <span className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                        FREE
                      </span>
                    </div>
                    <p className="text-lg font-bold leading-none text-emerald-300">
                      ₦0.00
                    </p>
                    {!freeEventEffectivelyClosed && (
                      <p className="pt-0.5 text-xs leading-relaxed text-white/65">
                        {/* Only show the per-order cap when it's the standard
                            10 — once remaining stock has pulled it lower,
                            showing the reduced number would leak how many
                            are left, the same signal we hide via the "Sold
                            out" (not "Only N left") badge above. */}
                        {freeEventMaxQty === FREE_EVENT_MAX_QTY
                          ? `Max ${FREE_EVENT_MAX_QTY} tickets per order`
                          : "Limited availability"}
                      </p>
                    )}
                  </div>

                  {/* Right: quantity control */}
                  <div className="flex-shrink-0 self-center">
                    {freeEventSoldOut ? (
                      <span className="rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-200">
                        Sold out
                      </span>
                    ) : freeEventEffectivelyClosed ? (
                      <span className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white/70">
                        Unavailable
                      </span>
                    ) : (
                      <div className="flex items-center overflow-hidden rounded-xl border-2 border-white/80">
                        <button
                          onClick={decrementFree}
                          disabled={freeQty <= 1}
                          className="flex h-9 w-9 items-center justify-center bg-white/90 text-[#6b2fa5] transition-all hover:bg-white active:scale-95 disabled:opacity-40"
                          aria-label="Remove one"
                        >
                          <Minus size={16} strokeWidth={2.5} />
                        </button>
                        <span className="flex h-9 w-9 select-none items-center justify-center bg-black/30 text-sm font-bold text-white">
                          {freeQty}
                        </span>
                        <button
                          onClick={incrementFree}
                          disabled={freeQty >= freeEventMaxQty}
                          className="flex h-9 w-9 items-center justify-center bg-[#6b2fa5] text-white transition-all hover:bg-purple-600 active:scale-95 disabled:bg-purple-400/60"
                          aria-label="Add one"
                        >
                          <Plus size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </TicketCardShell>
            ) : eventData.ticketPrices && eventData.ticketPrices.length > 0 ? (
              <>
                {!effectivelyClosed && (
                  <p className="pb-1 text-xs font-medium text-gray-400">
                    You can add multiple ticket types to your order.
                  </p>
                )}

                {(eventData.ticketPrices as TicketPrice[]).map((ticket, index) => {
                  const qty = quantities[index] ?? 0
                  const remaining = getRemaining(ticket)
                  const tierSoldOut = remaining !== null && remaining === 0
                  const saleStatus = getTicketSaleStatus(ticket, eventWideStop)
                  const tierNotOnSale = !saleStatus.onSale
                  const tierDisabled = effectivelyClosed || tierSoldOut || tierNotOnSale

                  let availBadge: React.ReactNode = null
                  if (tierNotOnSale) {
                    // Sale-window badge takes priority over the plain
                    // availability badge — it's the more specific reason.
                    availBadge = (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          saleStatus.reason === "not-started"
                            ? "border-amber-300/40 bg-amber-400/20 text-amber-200"
                            : "border-red-300/40 bg-red-500/20 text-red-200"
                        }`}
                      >
                        {describeSaleStatus(saleStatus)}
                      </span>
                    )
                  } else if (remaining !== null && tierSoldOut) {
                    // Only the binary "sold out" state is shown — the exact
                    // remaining count is intentionally never surfaced to
                    // buyers once the booker has set a limit (item: hide
                    // sold/remaining numbers).
                    availBadge = (
                      <span className="rounded-full border border-red-300/40 bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-200">
                        Sold out
                      </span>
                    )
                  }

                  return (
                    <TicketCardShell
                      key={index}
                      image={cardImage}
                      state={tierDisabled ? "disabled" : qty > 0 ? "selected" : "default"}
                    >
                      <div className="flex items-start justify-between gap-4 p-4">

                        {/* Left: ticket info */}
                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Name + availability badge */}
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-base font-bold leading-tight ${tierSoldOut ? "text-white/60" : "text-white"}`}>
                              {ticket.policy}
                            </p>
                            {availBadge}
                          </div>

                          {/* Price only — actual VAT/fee amount depends on cart
                              total + Burden of Fee and isn't final until checkout */}
                          <p className={`text-lg font-bold leading-none ${tierSoldOut ? "text-white/50" : "text-white"}`}>
                            ₦{formatNumber(Number(ticket.price) || 0)}
                          </p>
                          {(Number(ticket.price) || 0) > 0 && buyerOwesAnyFee && (
                            <p className="text-[11px] leading-snug text-white/60">
                              + VAT & Fees computed at checkout
                            </p>
                          )}

                          {/* Per-type cap hint */}
                          {!tierDisabled && (
                            <p className="pt-0.5 text-xs leading-relaxed text-white/65">
                              Max {MAX_QTY_PER_TYPE} per order
                            </p>
                          )}

                          {/* Description */}
                          {ticket.description && (
                            <p className="pt-0.5 text-xs leading-relaxed text-white/75">
                              {ticket.description}
                            </p>
                          )}
                        </div>

                        {/* Right: quantity control */}
                        <div className="flex-shrink-0 self-center">
                          {tierSoldOut ? (
                            <span className="rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-200">
                              Sold out
                            </span>
                          ) : effectivelyClosed ? (
                            <span className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white/70">
                              Unavailable
                            </span>
                          ) : tierNotOnSale ? (
                            <span
                              className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                                saleStatus.reason === "not-started"
                                  ? "border-amber-300/40 bg-amber-400/20 text-amber-200"
                                  : "border-white/25 bg-white/10 text-white/70"
                              }`}
                            >
                              {saleStatus.reason === "not-started" ? "Not yet on sale" : "Unavailable"}
                            </span>
                          ) : qty === 0 ? (
                            <button
                              onClick={() => increment(index)}
                              className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-[#6b2fa5] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-purple-600 active:scale-95"
                            >
                              <Plus size={15} strokeWidth={2.5} />
                              Add
                            </button>
                          ) : (
                            <div className="flex items-center overflow-hidden rounded-xl border-2 border-white/80">
                              <button
                                onClick={() => decrement(index)}
                                className="flex h-9 w-9 items-center justify-center bg-white/90 text-[#6b2fa5] transition-all hover:bg-white active:scale-95"
                                aria-label="Remove one"
                              >
                                <Minus size={16} strokeWidth={2.5} />
                              </button>
                              <span className="flex h-9 w-9 select-none items-center justify-center bg-black/30 text-sm font-bold text-white">
                                {qty}
                              </span>
                              <button
                                onClick={() => increment(index)}
                                disabled={
                                  qty >= MAX_QTY_PER_TYPE ||
                                  (remaining !== null && qty >= remaining)
                                }
                                className="flex h-9 w-9 items-center justify-center bg-[#6b2fa5] text-white transition-all hover:bg-purple-600 active:scale-95 disabled:bg-purple-400/60"
                                aria-label="Add one"
                              >
                                <Plus size={16} strokeWidth={2.5} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </TicketCardShell>
                  )
                })}
              </>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl text-sm">
                No ticket options available for this event.
              </div>
            )}
          </div>
        </div>

        {/* ── Pinned footer: cart summary + CTA ── */}
        {eventData.isFree ? (
          /* Free event footer */
          freeEventEffectivelyClosed ? (
            <div className="shrink-0 border-t border-gray-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                disabled
                className="w-full bg-gray-200 text-gray-500 py-3.5 px-4 rounded-xl font-semibold text-base cursor-not-allowed"
              >
                {freeEventSoldOut ? "Event Sold Out" : closedLabel}
              </button>
            </div>
          ) : (
            <div className="shrink-0 space-y-3 border-t border-gray-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-gray-700">
                  <span className="font-medium">
                    Free Admission{" "}
                    <span className="text-gray-400 font-normal">× {freeQty}</span>
                  </span>
                  <span className="font-semibold text-emerald-600">Free</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={16} className="text-[#6b2fa5]" />
                    <span className="font-bold text-gray-900 text-sm">
                      Total of {freeQty} ticket{freeQty !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-emerald-600">Free</span>
                </div>
              </div>
              <button
                onClick={handleFreeProceed}
                disabled={isProceeding}
                className="w-full flex items-center justify-center gap-2 bg-[#6b2fa5] text-white py-3.5 px-4 rounded-xl font-semibold text-base hover:bg-purple-700 active:scale-[0.99] transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {isProceeding ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    One moment..
                  </>
                ) : (
                  "Proceed to Register"
                )}
              </button>
            </div>
          )
        ) : cartItems.length > 0 ? (
          /* Paid event footer */
          <div className="shrink-0 space-y-3 border-t border-gray-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="space-y-1.5">
              {/* Capped so a big cart can't push the CTA off-screen on short phones */}
              <div className="spotix-scroll max-h-28 space-y-1.5 overflow-y-auto">
                {cartItems.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-700">
                    <span className="font-medium">
                      {item.ticketType}{" "}
                      <span className="text-gray-400 font-normal">× {item.quantity}</span>
                    </span>
                    {item.price === 0 ? (
                      <span className="font-semibold text-emerald-600">Free</span>
                    ) : (
                      <span className="font-semibold">₦{formatNumber(item.price * item.quantity)}</span>
                    )}
                  </div>
                ))}
              </div>
              {showFeeBreakdown && (
                <div className="flex justify-between text-xs text-gray-400 pt-1.5 border-t border-gray-100">
                  <span>VAT & Fees</span>
                  <span>Computed at checkout</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[#6b2fa5]" />
                  <span className="font-bold text-gray-900 text-sm">
                    Total of {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}
                  </span>
                </div>
                {subtotal === 0 ? (
                  <span className="text-xl font-bold text-emerald-600">Free</span>
                ) : (
                  <span className="text-xl font-bold text-[#6b2fa5]">
                    ₦{formatNumber(Math.round(subtotal))}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleProceed}
              disabled={isProceeding}
              className="w-full flex items-center justify-center gap-2 bg-[#6b2fa5] text-white py-3.5 px-4 rounded-xl font-semibold text-base hover:bg-purple-700 active:scale-[0.99] transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isProceeding ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  One moment..
                </>
              ) : (
                subtotal === 0 ? "Proceed to Register" : "Proceed to Payment"
              )}
            </button>
          </div>
        ) : effectivelyClosed ? (
          /* Closed state CTA at the bottom */
          <div className="shrink-0 border-t border-gray-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <button
              disabled
              className="w-full bg-gray-200 text-gray-500 py-3.5 px-4 rounded-xl font-semibold text-base cursor-not-allowed"
            >
              {closedLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default BuyTicketDrawer
