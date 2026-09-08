"use client"

import Link from "next/link"
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import { clearCart, updateQuantity, type CartLine } from "../lib/cart"

interface CartDrawerProps {
  eventId: string
  cart: CartLine[]
  onClose: () => void
}

/**
 * Cart-viewing modal for the shop route group — shows every line
 * currently in this event's cart (see shop/lib/cart.ts), lets the buyer
 * bump/drop a line's quantity or clear the whole cart in one go, and
 * hands off to /shop/payment. Mutates the SAME localStorage-persisted
 * cart every other shop page reads from, via cart.ts's mutators — no
 * cart state lives in this component, so it can't drift from the badge/
 * sticky-bar counts on the page that opened it.
 *
 * Callers own `cart` (from useShopCart) and pass it in rather than this
 * component subscribing itself, so the parent's own cartCount/subtotal
 * (already live via the same hook) update in lockstep with what's shown
 * here — no double subscription, no risk of the two disagreeing.
 */
export default function CartDrawer({ eventId, cart, onClose }: CartDrawerProps) {
  const subtotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0)
  const isEmpty = cart.length === 0

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm bg-black/40 flex items-start justify-center z-50 px-4 pt-20 pb-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={20} className="text-[#6b2fa5]" /> Your cart
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lines */}
        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center py-14 px-5 text-center">
            <ShoppingCart size={36} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">Your cart is empty.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 px-5">
            {cart.map((line) => (
              <div key={line.id} className="py-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={line.image}
                  alt={line.name}
                  className="w-14 h-14 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{line.name}</p>
                  <p className="text-sm text-gray-500">₦{formatNumber(line.price)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => updateQuantity(eventId, line.id, line.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    aria-label={line.quantity === 1 ? `Remove ${line.name}` : `Decrease ${line.name} quantity`}
                  >
                    {line.quantity === 1 ? <Trash2 size={13} /> : <Minus size={13} />}
                  </button>
                  <span className="w-5 text-center text-sm font-semibold text-gray-900">{line.quantity}</span>
                  <button
                    onClick={() => updateQuantity(eventId, line.id, line.quantity + 1)}
                    disabled={line.quantity >= line.stock}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
                    aria-label={`Increase ${line.name} quantity`}
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {!isEmpty && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => clearCart(eventId)}
                className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} /> Clear all
              </button>
              <span className="text-base font-bold text-gray-900">₦{formatNumber(subtotal)}</span>
            </div>
            <Link
              href={`/event/${eventId}/shop/payment`}
              onClick={onClose}
              className="block w-full text-center py-3 px-4 bg-[#6b2fa5] text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
