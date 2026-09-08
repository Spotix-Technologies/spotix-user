"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import { AlertCircle, Minus, Plus, ShoppingCart, Check } from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import { ShopHero } from "../components/ShopHero"
import CartDrawer from "../components/CartDrawer"
import { addToCart } from "../lib/cart"
import { useShopCart } from "../lib/useShopCart"
import type { ShopEventInfo, ShopMerchItem } from "../lib/types"

interface MerchDetailsClientProps {
  eventId: string
  data: {
    event: ShopEventInfo
    item: ShopMerchItem
    buyerOwesPaystackFee: boolean
  } | null
}

/**
 * Single merch item's storefront page — the hero shows the item's own
 * photo with a breadcrumb (event > shop > {merchName}) in the dark
 * overlay. Adding to cart or "Buy now" writes into the shared,
 * localStorage-persisted shop cart (see shop/lib/cart.ts) so it's still
 * there when the buyer reaches /event/{eventId}/shop/payment. The sticky
 * bottom bar's item count doubles as a button that opens CartDrawer, so
 * the buyer can review every line, adjust or drop a quantity, or clear
 * the whole cart in one go without leaving this page.
 */
export default function MerchDetailsClient({ eventId, data }: MerchDetailsClientProps) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [justAdded, setJustAdded] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)

  const { cart, count: cartCount } = useShopCart(eventId)

  if (!data) {
    return (
      <>
        <UserHeader />
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Item not found</h1>
          <p className="text-gray-500 mb-6">This item may have sold out or been removed.</p>
          <Link href={`/event/${eventId}/shop`} className="text-[#6b2fa5] font-semibold hover:underline">
            Back to shop
          </Link>
        </div>
      </>
    )
  }

  const { event, item, buyerOwesPaystackFee } = data
  const soldOut = item.stock === 0

  const putInCart = () => {
    addToCart(
      eventId,
      { id: item.id, name: item.name, price: item.price, image: item.image, stock: item.stock },
      quantity
    )
  }

  const handleAddToCart = () => {
    if (soldOut) return
    putInCart()
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1800)
  }

  const handleBuyNow = () => {
    if (soldOut) return
    putInCart()
    router.push(`/event/${eventId}/shop/payment`)
  }

  return (
    <>
      <UserHeader />
      <div className="min-h-screen pb-28 lg:pb-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <ShopHero
            image={item.image}
            title={item.name}
            crumbs={[
              { label: event.eventName, href: `/event/${eventId}` },
              { label: "Shop", href: `/event/${eventId}/shop` },
              { label: item.name },
            ]}
          />
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 border-purple-100">
            {item.description && <p className="text-gray-600 mb-5 leading-relaxed">{item.description}</p>}

            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-bold text-[#6b2fa5]">₦{formatNumber(item.price)}</span>
              <span className={`text-sm font-medium ${soldOut ? "text-red-500" : "text-gray-500"}`}>
                {soldOut ? "Sold out" : `${item.stock} ${item.stock === 1 ? "left" : "available"}`}
              </span>
            </div>

            {buyerOwesPaystackFee && !soldOut && (
              <p className="text-xs text-gray-400 mb-6">
                Paystack&apos;s processing fee is added on top of this at checkout.
              </p>
            )}

            {!soldOut && (
              <>
                {/* Quantity selector */}
                <div className="flex items-center gap-4 mt-6 mb-6">
                  <span className="text-sm font-medium text-gray-700">Quantity</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-semibold text-gray-900">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(item.stock, q + 1))}
                      disabled={quantity >= item.stock}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 py-3 px-4 border-2 border-[#6b2fa5] text-[#6b2fa5] rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {justAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
                    {justAdded ? "Added to cart" : "Add to cart"}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 py-3 px-4 bg-[#6b2fa5] text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                  >
                    Buy now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <button
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-2 text-gray-700 hover:text-[#6b2fa5] transition-colors"
            >
              <ShoppingCart size={18} className="text-[#6b2fa5]" />
              <span className="font-semibold">
                {cartCount} item{cartCount === 1 ? "" : "s"} in cart
              </span>
            </button>
            <Link
              href={`/event/${eventId}/shop/payment`}
              className="px-5 py-2.5 bg-[#6b2fa5] text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Checkout
            </Link>
          </div>
        </div>
      )}

      {cartOpen && <CartDrawer eventId={eventId} cart={cart} onClose={() => setCartOpen(false)} />}

      <Footer />
    </>
  )
}
