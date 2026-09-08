"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import { Loader, ShoppingCart, ShoppingBag, AlertCircle } from "lucide-react"
import { formatNumber } from "@/utils/formatter"
import { ShopHero } from "./components/ShopHero"
import { useShopCart } from "./lib/useShopCart"
import type { ShopMerchItem, ShopEventInfo } from "./lib/types"

interface ShopClientProps {
  eventId: string
  initialEvent: ShopEventInfo | null
}

/**
 * Full shop listing for an event — every active merch listing, fetched
 * from the same /api/v1/event/merch route the event-page teaser uses,
 * just without the `limit` param. Each card links to the merch details
 * page; a persistent bottom bar appears once anything is in the cart
 * (see shop/lib/cart.ts) and links to checkout.
 */
export default function ShopClient({ eventId, initialEvent }: ShopClientProps) {
  const [merch, setMerch] = useState<ShopMerchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paystackHint, setPaystackHint] = useState(false)

  const { count: cartCount, subtotal: cartSubtotal } = useShopCart(eventId)

  useEffect(() => {
    let cancelled = false
    const fetchMerch = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/v1/event/merch?eventId=${eventId}`)
        const result = await res.json()
        if (cancelled) return
        if (res.ok && result.success) {
          setMerch(result.data || [])
          setPaystackHint(!!result.feeBurden?.buyerOwesPaystackFee)
        } else {
          setError(result.error || "Failed to load merchandise")
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching shop merchandise:", err)
          setError("Failed to load merchandise")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (eventId) fetchMerch()
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (!initialEvent) {
    return (
      <>
        <UserHeader />
        <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Shop not found</h1>
          <p className="text-gray-500 mb-6">This event doesn&apos;t exist or has been removed.</p>
          <Link href="/discover" className="text-[#6b2fa5] font-semibold hover:underline">
            Discover events
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <UserHeader />
      <div className="min-h-screen pb-24 lg:pb-12 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 pt-4">
          {/* Main image = the event's own eventImage, not any merch item's photo */}
          <ShopHero
            image={initialEvent.eventImage}
            title={`${initialEvent.eventName}'s shop`}
            crumbs={[{ label: initialEvent.eventName, href: `/event/${eventId}` }, { label: "Shop" }]}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader className="w-8 h-8 text-[#6b2fa5] animate-spin" />
              <span className="ml-3 text-gray-600">Loading merchandise...</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
          )}

          {!loading && !error && merch.length === 0 && (
            <div className="text-center py-16">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No merchandise available for this event yet.</p>
            </div>
          )}

          {!loading && merch.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                {merch.map((item) => (
                  <Link
                    key={item.id}
                    href={`/event/${eventId}/shop/${item.id}`}
                    className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow block"
                  >
                    <div className="w-full aspect-square bg-gray-200 overflow-hidden">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-3 sm:p-4">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-1">
                        {item.name}
                      </h4>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[#6b2fa5] font-bold text-sm sm:text-lg">
                          ₦{formatNumber(item.price)}
                        </span>
                        <span className="text-[11px] sm:text-xs text-gray-500">
                          {item.stock === 0 ? "Sold out" : `${item.stock} left`}
                        </span>
                      </div>
                      <span className="mt-3 w-full py-2 px-3 bg-[#6b2fa5] text-white rounded-lg text-xs sm:text-sm font-medium group-hover:bg-purple-700 transition-colors flex items-center justify-center">
                        View details
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {paystackHint && (
                <p className="text-xs text-gray-400 mt-6 text-center">
                  Prices shown include Spotix&apos;s merch fee where applicable — Paystack&apos;s processing
                  fee is added at checkout.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <ShoppingCart size={18} className="text-[#6b2fa5]" />
              <span className="font-semibold">
                {cartCount} item{cartCount === 1 ? "" : "s"}
              </span>
              <span className="text-gray-400">·</span>
              <span className="font-bold text-[#6b2fa5]">₦{formatNumber(cartSubtotal)}</span>
            </div>
            <Link
              href={`/event/${eventId}/shop/payment`}
              className="px-5 py-2.5 bg-[#6b2fa5] text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Checkout
            </Link>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}
