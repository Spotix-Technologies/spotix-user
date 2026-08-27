"use client"

import React, { useState, useMemo } from "react"
import { X, Plus, Minus, ShoppingCart, Clock, AlertTriangle, Loader2 } from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import { calculateVATFee, calculateFinalPrice } from "@/utils/priceUtility"
import type { EventType } from "./page"

interface CartItem {
  ticketType: string
  policy: string
  price: number
  quantity: number
  vat: number
}

interface TicketPrice {
  policy: string
  price: number
  description?: string
  availableTickets?: number
  ticketsSold?: number
}

interface BuyTicketDialogProps {
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

// ── Component ─────────────────────────────────────────────────────────────────

const BuyTicketDialog: React.FC<BuyTicketDialogProps> = ({
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

  // ── Sale status (computed once on mount) ─────────────────────────────────

  const eventStarted = useMemo(
    () => hasEventStarted(eventData.eventDate, eventData.eventStart),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  const activeStopDate =
    eventData.enableStopDate && eventData.stopDate ? eventData.stopDate : undefined

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

  // ── Cart (paid events) ────────────────────────────────────────────────────

  const cartItems: CartItem[] = (eventData.ticketPrices ?? [])
    .map((ticket, index) => {
      const qty = quantities[index] ?? 0
      if (qty === 0) return null
      const t = ticket as TicketPrice
      const price = Number(t.price) || 0
      return {
        ticketType: t.policy,
        policy: t.policy,
        price,
        quantity: qty,
        vat: calculateVATFee(price),
      }
    })
    .filter((item): item is CartItem => item !== null)

  const totalTickets = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalVat = cartItems.reduce((sum, i) => sum + i.vat * i.quantity, 0)
  const grandTotal = subtotal + totalVat

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
  
  return (
    
    
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 px-4 pt-20 pb-4 overflow-y-auto">
   
    <style>{`
    .spotix-scroll::-webkit-scrollbar { width: 6px; }
    .spotix-scroll::-webkit-scrollbar-track { background: transparent; }
    .spotix-scroll::-webkit-scrollbar-thumb { background: #6b2fa5; border-radius: 999px; }
    .spotix-scroll::-webkit-scrollbar-thumb:hover { background: #5a2590; }
  `}</style>
  
  <div className="spotix-scroll bg-white rounded-2xl max-w-2xl w-full max-h-[calc(100vh-6rem)] overflow-y-auto shadow-2xl">

        {/* ── Header ── */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-5 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Select Tickets</h2>
            <p className="text-gray-500 text-sm mt-0.5">{eventData.eventName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Close dialog"
          >
            <X size={22} />
          </button>
        </div>

        {/* ── Status banners ── */}
        <div className="px-5 pt-4 space-y-2">

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
        <div className="p-5 space-y-3">
          {eventData.isFree ? (
            /* ── Free event: quantity picker ── */
            <div className={`border rounded-xl transition-all ${
              freeEventEffectivelyClosed
                ? "border-gray-200 bg-gray-50 opacity-60"
                : "border-[#6b2fa5] bg-purple-50"
            }`}>
              <div className="flex items-start justify-between p-4 gap-4">
                {/* Left: ticket info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-base leading-tight text-gray-900">
                      Free Admission
                    </p>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      FREE
                    </span>
                  </div>
                  <p className="font-bold text-lg leading-none text-emerald-600">
                    ₦0.00
                  </p>
                  {!freeEventEffectivelyClosed && (
                    <p className="text-xs text-gray-500 leading-relaxed pt-0.5">
                      Max {freeEventMaxQty} ticket{freeEventMaxQty !== 1 ? "s" : ""} per order
                    </p>
                  )}
                </div>

                {/* Right: quantity control */}
                <div className="flex-shrink-0 self-center">
                  {freeEventSoldOut ? (
                    <span className="text-sm font-semibold text-red-500 px-3 py-2 border border-red-200 rounded-xl bg-white">
                      Sold out
                    </span>
                  ) : freeEventEffectivelyClosed ? (
                    <span className="text-sm font-semibold text-gray-400 px-3 py-2 border border-gray-200 rounded-xl bg-white">
                      Unavailable
                    </span>
                  ) : (
                    <div className="flex items-center border-2 border-[#6b2fa5] rounded-xl overflow-hidden">
                      <button
                        onClick={decrementFree}
                        disabled={freeQty <= 1}
                        className="w-9 h-9 flex items-center justify-center bg-white text-[#6b2fa5] hover:bg-purple-50 active:scale-95 transition-all disabled:opacity-40"
                        aria-label="Remove one"
                      >
                        <Minus size={16} strokeWidth={2.5} />
                      </button>
                      <span className="w-9 h-9 flex items-center justify-center font-bold text-[#6b2fa5] text-sm select-none">
                        {freeQty}
                      </span>
                      <button
                        onClick={incrementFree}
                        disabled={freeQty >= freeEventMaxQty}
                        className="w-9 h-9 flex items-center justify-center bg-[#6b2fa5] text-white hover:bg-purple-700 active:scale-95 transition-all disabled:bg-purple-300"
                        aria-label="Add one"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : eventData.ticketPrices && eventData.ticketPrices.length > 0 ? (
            <>
              {!effectivelyClosed && (
                <p className="text-xs font-medium text-gray-400 pb-1">
                  You can add multiple ticket types to your order.
                </p>
              )}

              {(eventData.ticketPrices as TicketPrice[]).map((ticket, index) => {
                const qty = quantities[index] ?? 0
                const remaining = getRemaining(ticket)
                const tierSoldOut = remaining !== null && remaining === 0
                const tierDisabled = effectivelyClosed || tierSoldOut

                // Availability badge — driven purely by availableTickets
                // null  → unlimited, show nothing
                // 0     → sold out
                // 1–10  → urgency: red "Only N left!" banner
                // >10   → no badge (no noise)
                let availBadge: React.ReactNode = null
                if (remaining !== null) {
                  if (tierSoldOut) {
                    availBadge = (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        Sold out
                      </span>
                    )
                  } else if (remaining <= 10) {
                    availBadge = (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full animate-pulse">
                        🔥 Only {remaining} left!
                      </span>
                    )
                  }
                }

                return (
                  <div
                    key={index}
                    className={`border rounded-xl transition-all ${
                      tierDisabled
                        ? "border-gray-200 bg-gray-50 opacity-60"
                        : qty > 0
                          ? "border-[#6b2fa5] bg-purple-50"
                          : "border-gray-200 bg-white hover:border-purple-300"
                    }`}
                  >
                    <div className="flex items-start justify-between p-4 gap-4">

                      {/* Left: ticket info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Name + availability badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-bold text-base leading-tight ${tierSoldOut ? "text-gray-400" : "text-gray-900"}`}>
                            {ticket.policy}
                          </p>
                          {availBadge}
                        </div>

                        {/* Price + VAT */}
                        <p className={`font-bold text-lg leading-none ${tierSoldOut ? "text-gray-400" : "text-[#6b2fa5]"}`}>
                          ₦{formatNumber(Number(ticket.price) || 0)}
                          {(Number(ticket.price) || 0) > 0 && (
                            <span className="text-xs font-normal text-gray-400 ml-1.5">
                              +₦{formatNumber(calculateVATFee(Number(ticket.price)))} VAT
                            </span>
                          )}
                        </p>

                        {/* Per-type cap hint */}
                        {!tierDisabled && (
                          <p className="text-xs text-gray-400 leading-relaxed pt-0.5">
                            Max {MAX_QTY_PER_TYPE} per order
                          </p>
                        )}

                        {/* Description */}
                        {ticket.description && (
                          <p className="text-xs text-gray-500 leading-relaxed pt-0.5">
                            {ticket.description}
                          </p>
                        )}
                      </div>

                      {/* Right: quantity control */}
                      <div className="flex-shrink-0 self-center">
                        {tierSoldOut ? (
                          <span className="text-sm font-semibold text-red-500 px-3 py-2 border border-red-200 rounded-xl bg-red-50">
                            Sold out
                          </span>
                        ) : effectivelyClosed ? (
                          <span className="text-sm font-semibold text-gray-400 px-3 py-2 border border-gray-200 rounded-xl bg-white">
                            Unavailable
                          </span>
                        ) : qty === 0 ? (
                          <button
                            onClick={() => increment(index)}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#6b2fa5] text-white rounded-xl font-semibold text-sm hover:bg-purple-700 active:scale-95 transition-all"
                          >
                            <Plus size={15} strokeWidth={2.5} />
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center border-2 border-[#6b2fa5] rounded-xl overflow-hidden">
                            <button
                              onClick={() => decrement(index)}
                              className="w-9 h-9 flex items-center justify-center bg-white text-[#6b2fa5] hover:bg-purple-50 active:scale-95 transition-all"
                              aria-label="Remove one"
                            >
                              <Minus size={16} strokeWidth={2.5} />
                            </button>
                            <span className="w-9 h-9 flex items-center justify-center font-bold text-[#6b2fa5] text-sm select-none">
                              {qty}
                            </span>
                            <button
                              onClick={() => increment(index)}
                              disabled={
                                qty >= MAX_QTY_PER_TYPE ||
                                (remaining !== null && qty >= remaining)
                              }
                              className="w-9 h-9 flex items-center justify-center bg-[#6b2fa5] text-white hover:bg-purple-700 active:scale-95 transition-all disabled:bg-purple-300"
                              aria-label="Add one"
                            >
                              <Plus size={16} strokeWidth={2.5} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-xl text-sm">
              No ticket options available for this event.
            </div>
          )}
        </div>

        {/* ── Sticky footer: cart summary + CTA ── */}
        {eventData.isFree ? (
          /* Free event footer */
          freeEventEffectivelyClosed ? (
            <div className="px-5 pb-5">
              <button
                disabled
                className="w-full bg-gray-200 text-gray-500 py-3.5 px-4 rounded-xl font-semibold text-base cursor-not-allowed"
              >
                {freeEventSoldOut ? "Event Sold Out" : closedLabel}
              </button>
            </div>
          ) : (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-5 space-y-3">
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
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-5 space-y-3">
            <div className="space-y-1.5">
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
              {totalVat > 0 && (
                <div className="flex justify-between text-xs text-gray-400 pt-1.5 border-t border-gray-100">
                  <span>VAT & Fees</span>
                  <span>₦{formatNumber(totalVat)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[#6b2fa5]" />
                  <span className="font-bold text-gray-900 text-sm">
                    Total of {totalTickets} ticket{totalTickets !== 1 ? "s" : ""}
                  </span>
                </div>
                {grandTotal === 0 ? (
                  <span className="text-xl font-bold text-emerald-600">Free</span>
                ) : (
                  <span className="text-xl font-bold text-[#6b2fa5]">
                    ₦{formatNumber(Math.round(grandTotal))}
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
                grandTotal === 0 ? "Proceed to Register" : "Proceed to Payment"
              )}
            </button>
          </div>
        ) : effectivelyClosed ? (
          /* Closed state CTA at the bottom */
          <div className="px-5 pb-5">
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

export default BuyTicketDialog