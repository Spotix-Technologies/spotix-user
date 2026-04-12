"use client"

import React, { useState } from "react"
import { X, Plus, Minus } from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import type { EventType } from "./page"

interface BuyTicketDialogProps {
  eventData: EventType
  isEventToday: boolean
  isEventPassed: boolean
  isSoldOut: boolean
  isSaleEnded: boolean
  onBuyTicket: (cart: Array<{ ticketType: string; policy: string; price: number; quantity: number }>) => void
  onClose: () => void
  onShowPassedDialog?: () => void
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
  const [selectedTickets, setSelectedTickets] = useState<
    Record<string, { quantity: number; policy: string; price: number }>
  >({})

  const handleAddTicket = (index: number, policy: string, price: number) => {
    setSelectedTickets((prev) => {
      const key = `ticket_${index}`
      const current = prev[key] || { quantity: 0, policy, price }
      return {
        ...prev,
        [key]: { ...current, quantity: current.quantity + 1 },
      }
    })
  }

  const handleRemoveTicket = (index: number) => {
    setSelectedTickets((prev) => {
      const key = `ticket_${index}`
      if (prev[key]?.quantity > 1) {
        return {
          ...prev,
          [key]: { ...prev[key], quantity: prev[key].quantity - 1 },
        }
      }
      const { [key]: _, ...rest } = prev
      return rest
    })
  }

  const cartItems = Object.entries(selectedTickets)
    .filter(([, item]) => item.quantity > 0)
    .map(([, item]) => ({
      ticketType: item.policy,
      policy: item.policy,
      price: item.price,
      quantity: item.quantity,
    }))

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleProceed = () => {
    if (cartItems.length === 0) {
      alert("Please select at least one ticket")
      return
    }
    onBuyTicket(cartItems)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Select Tickets</h2>
            <p className="text-gray-600 text-sm mt-1">{eventData.eventName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Messages */}
          {isEventPassed && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              This event has already occurred. You can no longer purchase tickets.
            </div>
          )}
          {isSoldOut && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              This event is sold out. No tickets are available.
            </div>
          )}
          {isSaleEnded && (
            <div className="p-4 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-sm">
              Ticket sales for this event have ended.
            </div>
          )}
          {isEventToday && (
            <div className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <span>This event is happening today!</span>
            </div>
          )}

          {/* Ticket Options */}
          {!eventData.isFree && eventData.ticketPrices && eventData.ticketPrices.length > 0 ? (
            <div className="space-y-3">
              <p className="font-semibold text-gray-900">Choose your tickets:</p>
              {eventData.ticketPrices.map((ticket, index) => {
                const key = `ticket_${index}`
                const selected = selectedTickets[key]
                const quantity = selected?.quantity || 0

                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{ticket.policy}</p>
                      <p className="text-xl font-bold text-[#6b2fa5]">₦{formatNumber(ticket.price)}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {quantity > 0 && (
                        <span className="w-8 h-8 flex items-center justify-center bg-purple-100 text-[#6b2fa5] rounded-lg font-semibold">
                          {quantity}
                        </span>
                      )}

                      {quantity === 0 ? (
                        <button
                          onClick={() => handleAddTicket(index, ticket.policy, ticket.price)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#6b2fa5] text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                        >
                          <Plus size={18} />
                          Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => handleRemoveTicket(index)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            aria-label="Remove ticket"
                          >
                            <Minus size={16} />
                          </button>
                          <button
                            onClick={() => handleAddTicket(index, ticket.policy, ticket.price)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            aria-label="Add ticket"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : eventData.isFree ? (
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-lg font-semibold text-green-700 mb-2">Free Event</p>
              <p className="text-green-600 mb-4">This is a free event. Click the button below to register.</p>
              <button
                onClick={() => handleProceed()}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Register Now
              </button>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg">
              No ticket options available for this event.
            </div>
          )}
        </div>

        {/* Footer */}
        {!eventData.isFree && cartItems.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-semibold text-gray-900">₦{formatNumber(totalPrice)}</span>
              </div>
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                <span className="text-gray-700">Processing Fee:</span>
                <span className="font-semibold text-gray-900">₦0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-[#6b2fa5]">₦{formatNumber(totalPrice)}</span>
              </div>
            </div>

            <button
              onClick={handleProceed}
              disabled={isEventPassed || isSoldOut || isSaleEnded}
              className="w-full bg-[#6b2fa5] text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Proceed to Payment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default BuyTicketDialog
