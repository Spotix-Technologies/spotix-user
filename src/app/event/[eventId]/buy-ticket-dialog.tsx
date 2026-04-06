"use client"

import type React from "react"
import { X, Ticket, AlertTriangle, ShoppingCart, CheckCircle, Clock, TrendingUp, Zap, Shield, Sparkles } from "lucide-react"
import { formatCurrency } from "@/utils/formatter"
import { calculateVATFee, calculateFinalPrice } from "@/utils/priceUtility"

interface TicketType {
  policy: string
  price: number
  description?: string
  availableTickets?: number
  soldTickets?: number
}

interface BuyTicketDialogProps {
  eventData: {
    isFree: boolean
    ticketPrices?: TicketType[]
    enableStopDate?: boolean
    stopDate?: string
  }
  isEventToday: boolean
  isEventPassed: boolean
  isSoldOut: boolean
  isSaleEnded: boolean
  onBuyTicket: (ticketType: string, ticketPrice: number | string) => void
  onClose: () => void
  onShowPassedDialog: () => void
}

const BuyTicketDialog: React.FC<BuyTicketDialogProps> = ({
  eventData,
  isEventToday,
  isEventPassed,
  isSoldOut,
  isSaleEnded,
  onBuyTicket,
  onClose,
  onShowPassedDialog,
}) => {
  // Check if a specific ticket type is sold out
  const isTicketTypeSoldOut = (ticket: TicketType) => {
    if (!ticket.availableTickets) return false
    const soldCount = ticket.soldTickets || 0
    return soldCount >= ticket.availableTickets
  }

  // Get remaining tickets for a ticket type
  const getRemainingTickets = (ticket: TicketType) => {
    if (!ticket.availableTickets) return null
    const soldCount = ticket.soldTickets || 0
    return Math.max(0, ticket.availableTickets - soldCount)
  }

  // Calculate percentage sold
  const getPercentageSold = (ticket: TicketType) => {
    if (!ticket.availableTickets) return 0
    const soldCount = ticket.soldTickets || 0
    return Math.round((soldCount / ticket.availableTickets) * 100)
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl my-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6b2fa5] via-purple-600 to-[#6b2fa5] px-6 md:px-8 py-5 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <ShoppingCart size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">Select Your Tickets</h2>
              <p className="text-sm text-purple-100 mt-0.5">Choose the perfect ticket for your experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:rotate-90 flex-shrink-0"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-5">
          {/* Status Messages */}
          {isEventToday && !isEventPassed && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-5 shadow-sm animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <Zap size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 text-lg mb-1">Event Happening Today!</h3>
                  <p className="text-sm text-red-700 leading-relaxed">
                    🔥 Don't miss out! This event is happening today. Grab your tickets now before they're gone!
                  </p>
                </div>
              </div>
            </div>
          )}

          {isSoldOut && (
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-300 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <AlertTriangle size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Sold Out</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    This event is completely sold out. All tickets have been claimed!
                  </p>
                </div>
              </div>
            </div>
          )}

          {isSaleEnded && !isSoldOut && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <Clock size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-yellow-900 text-lg mb-1">Sales Ended</h3>
                  <p className="text-sm text-yellow-700 leading-relaxed">
                    Ticket sales have ended for this event. No more tickets are available for purchase.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isEventPassed && (
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-300 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <Clock size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Event Completed</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    This event has already taken place. Check out other upcoming events!
                  </p>
                </div>
              </div>
            </div>
          )}

          {eventData.enableStopDate && eventData.stopDate && !isSaleEnded && (
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <Clock size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-blue-900 text-lg mb-1">Limited Time</h3>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    <strong>Ticket sales end:</strong> {new Date(eventData.stopDate).toLocaleString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tickets */}
          {eventData.isFree ? (
            <div className="text-center">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-8 md:p-10 shadow-lg">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-lg mb-6">
                  <Ticket size={40} className="text-emerald-600" />
                </div>
                <h3 className="text-3xl font-bold text-emerald-900 mb-3 flex items-center justify-center gap-2">
                  <Sparkles size={24} className="text-emerald-600" />
                  Free Event
                  <Sparkles size={24} className="text-emerald-600" />
                </h3>
                <p className="text-lg text-emerald-700 mb-6 max-w-md mx-auto">
                  This is a complimentary event - no payment required! Register now to secure your spot.
                </p>

                {isEventPassed ? (
                  <button
                    onClick={() => {
                      onClose()
                      onShowPassedDialog()
                    }}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gray-400 text-white rounded-xl font-bold cursor-not-allowed shadow-lg"
                    disabled
                  >
                    <Clock size={20} />
                    Event Has Passed
                  </button>
                ) : (
                  <button
                    onClick={() => onBuyTicket("Free Admission", 0)}
                    disabled={isSoldOut || isSaleEnded}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-green-700 transition-all disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105 transform disabled:hover:scale-100"
                  >
                    <CheckCircle size={20} />
                    {isEventToday ? "Register Now - Today's Event!" : "Get Free Ticket"}
                  </button>
                )}

                {/* Security Badge */}
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-emerald-700">
                  <Shield size={16} />
                  <span>Free registration • No payment required</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-purple-600" />
                  Available Tickets
                </h3>
                {Array.isArray(eventData.ticketPrices) && eventData.ticketPrices.length > 1 && (
                  <span className="text-sm text-gray-500">{eventData.ticketPrices.length} options</span>
                )}
              </div>

              {Array.isArray(eventData.ticketPrices) && eventData.ticketPrices.length > 0 ? (
                <div className="space-y-4">
                  {eventData.ticketPrices.map((ticket, index) => {
                    const isThisTicketSoldOut = isTicketTypeSoldOut(ticket)
                    const remainingTickets = getRemainingTickets(ticket)
                    const isLowStock = remainingTickets !== null && remainingTickets <= 10 && remainingTickets > 0
                    const percentageSold = getPercentageSold(ticket)
                    
                    // Calculate VAT fee and final price
                    // Convert ticket.price to number explicitly to ensure mathematical addition (not string concatenation)
                    const ticketPrice = Number(ticket.price)
                    const vatFee = ticketPrice > 0 ? calculateVATFee(ticketPrice) : 0
                    const finalPrice = ticketPrice > 0 ? calculateFinalPrice(ticketPrice) : 0

                    return (
                      <div
                        key={index}
                        className={`group rounded-2xl p-6 transition-all shadow-md hover:shadow-xl ${
                          isThisTicketSoldOut
                            ? "border-2 border-gray-300 bg-gray-50 opacity-70"
                            : "border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white hover:border-purple-400 hover:scale-[1.02]"
                        }`}
                      >
                        {/* Ticket Header */}
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                <Ticket size={16} className="text-purple-600" />
                              </div>
                              <h4 className="text-xl font-bold text-gray-900">{ticket.policy}</h4>
                              {isThisTicketSoldOut && (
                                <span className="inline-flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                                  <X size={12} />
                                  SOLD OUT
                                </span>
                              )}
                            </div>
                            {ticket.description && (
                              <p className="text-sm text-gray-600 leading-relaxed">{ticket.description}</p>
                            )}
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0">
                            {ticketPrice === 0 ? (
                              <div className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-md">
                                <CheckCircle size={16} />
                                FREE
                              </div>
                            ) : (
                              <div>
                                <div className="text-3xl font-bold text-purple-600">
                                  {formatCurrency(finalPrice)}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">final price</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* VAT Fee Notice */}
                        {ticketPrice > 0 && (
                          <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <Shield size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm text-gray-700">
                                  <span className="font-semibold">Base price:</span> {formatCurrency(ticketPrice)}
                                </p>
                                <p className="text-sm text-purple-700 font-medium">
                                  With an additional {formatCurrency(vatFee)} VAT fee
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Availability Info with Progress Bar */}
                        {remainingTickets !== null && (
                          <div className="space-y-3 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  isThisTicketSoldOut ? "bg-red-100" : isLowStock ? "bg-yellow-100" : "bg-green-100"
                                }`}>
                                  <Ticket size={12} className={
                                    isThisTicketSoldOut ? "text-red-600" : isLowStock ? "text-yellow-600" : "text-green-600"
                                  } />
                                </div>
                                <span className={`font-semibold ${
                                  isThisTicketSoldOut ? "text-red-600" : isLowStock ? "text-yellow-700" : "text-gray-700"
                                }`}>
                                  {isThisTicketSoldOut ? (
                                    "Sold Out"
                                  ) : (
                                    <>
                                      {formatNumber(remainingTickets)} of {formatNumber(ticket.availableTickets!)} available
                                    </>
                                  )}
                                </span>
                              </div>
                              <span className="text-gray-500 font-medium">{percentageSold}% sold</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isThisTicketSoldOut
                                    ? "bg-red-500"
                                    : isLowStock
                                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                    : "bg-gradient-to-r from-purple-500 to-purple-600"
                                }`}
                                style={{ width: `${percentageSold}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Low Stock Warning */}
                        {isLowStock && !isThisTicketSoldOut && (
                          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-xl p-3 mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <AlertTriangle size={14} className="text-white" />
                              </div>
                              <span className="text-yellow-900 text-sm font-bold">
                                Only {remainingTickets} ticket{remainingTickets !== 1 ? 's' : ''} left! Act fast!
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Buy Button */}
                        <div className="flex justify-end">
                          {isEventPassed ? (
                            <button
                              onClick={() => {
                                onClose()
                                onShowPassedDialog()
                              }}
                              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-400 text-white rounded-xl font-bold cursor-not-allowed shadow-md"
                              disabled
                            >
                              <Clock size={18} />
                              Event Passed
                            </button>
                          ) : (
                            <button
                              onClick={() => onBuyTicket(ticket.policy, ticket.price)}
                              disabled={isSoldOut || isSaleEnded || isThisTicketSoldOut}
                              className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg transform ${
                                isThisTicketSoldOut || isSoldOut || isSaleEnded
                                  ? "bg-gray-400 text-white cursor-not-allowed"
                                  : "bg-gradient-to-r from-[#6b2fa5] to-purple-600 text-white hover:from-purple-700 hover:to-purple-700 hover:shadow-xl hover:scale-105"
                              }`}
                            >
                              {isThisTicketSoldOut ? (
                                <>
                                  <X size={18} />
                                  Sold Out
                                </>
                              ) : isEventToday ? (
                                <>
                                  <Zap size={18} />
                                  Get Tickets Now
                                </>
                              ) : (
                                <>
                                  <ShoppingCart size={18} />
                                  Buy Ticket
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-2">No Tickets Available</p>
                  <p className="text-sm text-gray-500">No ticket pricing information available for this event.</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default BuyTicketDialog