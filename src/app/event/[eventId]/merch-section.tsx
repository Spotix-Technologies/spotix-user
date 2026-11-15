"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingBag, Loader, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { formatNumber } from "@/utils/formatter"

interface MerchItem {
  id: string
  name: string
  price: number
  image: string
  description?: string
  stock: number
}

interface MerchSectionProps {
  eventId: string
  /** The resolved real Firestore doc id — eventId above is whatever the URL
   *  segment was (could be a booker-chosen shareable slug, see page.tsx's
   *  fetchEventData comment), and /api/v1/event/merch does a direct
   *  events/{eventId}/listings lookup with no slug fallback. Using the raw
   *  slug there silently returns an empty listings snapshot (200, no
   *  error) instead of the real merch, so the API call has to use this
   *  instead. `eventId` itself is still what's used to build the /shop
   *  links below, so navigation keeps the shareable slug URL. */
  apiEventId: string
  createdBy: string
  eventName: string
}

const MERCH_TEASER_LIMIT = 3

/**
 * Buyer-facing merch teaser embedded on the event page. Listing data
 * comes from /api/v1/event/merch (Supabase-backed — see that route),
 * capped at MERCH_TEASER_LIMIT and already fee-adjusted for this event's
 * Burden of Fee setting, so the price shown here always matches what
 * checkout will actually charge (up to Paystack's own cart-wide fee).
 *
 * This section is a teaser only — cart, checkout and payment all live
 * under the dedicated shop (/event/{eventId}/shop and
 * /event/{eventId}/shop/{merchId}), which is what "View details" and
 * "View all" link out to. See shop/lib/cart.ts and
 * shop/payment/ShopPaymentClient.tsx for that flow.
 *
 * On mobile the (at most 3) cards page one at a time with arrow
 * navigation; from sm: up they're just laid out in a row.
 */
const MerchSection: React.FC<MerchSectionProps> = ({ eventId, apiEventId }) => {
  const [merch, setMerch] = useState<MerchItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [paystackHint, setPaystackHint] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slide, setSlide] = useState(0)

  // Fetch merchandise — teaser-sized slice only
  useEffect(() => {
    let cancelled = false
    const fetchMerch = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/v1/event/merch?eventId=${apiEventId}&limit=${MERCH_TEASER_LIMIT}`
        )
        const result = await response.json()
        if (cancelled) return
        if (response.ok && result.success) {
          setMerch(result.data || [])
          setTotalCount(
            typeof result.totalCount === "number" ? result.totalCount : (result.data || []).length
          )
          setPaystackHint(!!result.feeBurden?.buyerOwesPaystackFee)
        } else {
          setError(result.error || "Failed to load merchandise")
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching merchandise:", err)
          setError("Failed to load merchandise")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (apiEventId) fetchMerch()
    return () => {
      cancelled = true
    }
  }, [apiEventId])

  // Don't render section if no merch available
  if (!loading && merch.length === 0) {
    return null
  }

  const goPrev = () => setSlide((i) => (merch.length === 0 ? 0 : i === 0 ? merch.length - 1 : i - 1))
  const goNext = () => setSlide((i) => (merch.length === 0 ? 0 : i === merch.length - 1 ? 0 : i + 1))

  const MerchCard = ({ item }: { item: MerchItem }) => (
    <Link
      href={`/event/${eventId}/shop/${item.id}`}
      className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow block bg-white"
    >
      {/* Image */}
      <div className="w-full h-48 bg-gray-200 overflow-hidden">
        <img
          src={item.image || "/placeholder.svg"}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
        />
      </div>

      {/* Details */}
      <div className="p-4">
        <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
        {item.description && (
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-bold text-[#6b2fa5]">₦{formatNumber(item.price)}</span>
          <span className="text-xs text-gray-500">
            {item.stock === 0 ? "Sold out" : `${item.stock} ${item.stock === 1 ? "left" : "available"}`}
          </span>
        </div>
        <span className="w-full py-2 px-3 bg-[#6b2fa5] text-white rounded-lg font-medium group-hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
          <ShoppingBag size={16} />
          View details
        </span>
      </div>
    </Link>
  )

  return (
    <div className="bg-white rounded-3xl shadow-sm p-6 lg:p-8 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-gray-900">Event Merchandise</h3>
        {!loading && merch.length > 0 && (
          <Link
            href={`/event/${eventId}/shop`}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#6b2fa5] hover:text-purple-800 transition-colors shrink-0"
          >
            View all <ArrowRight size={16} />
          </Link>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-[#6b2fa5] animate-spin" />
          <span className="ml-3 text-gray-600">Loading merchandise...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
      )}

      {!loading && merch.length > 0 && (
        <>
          {/* Mobile — one card at a time, arrows either side of the image */}
          <div className="sm:hidden">
            <div className="relative">
              <MerchCard item={merch[slide]} />
              {merch.length > 1 && (
                <>
                  <button
                    onClick={goPrev}
                    aria-label="Previous item"
                    className="absolute left-2 top-24 -translate-y-1/2 z-10 bg-[#6b2fa5] hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-colors"
                  >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={goNext}
                    aria-label="Next item"
                    className="absolute right-2 top-24 -translate-y-1/2 z-10 bg-[#6b2fa5] hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-colors"
                  >
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </button>
                </>
              )}
            </div>
            {merch.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                {merch.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSlide(index)}
                    aria-label={`Go to item ${index + 1}`}
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: index === slide ? "24px" : "8px",
                      background: index === slide ? "#6b2fa5" : "rgba(107, 47, 165, 0.35)",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* sm and up — neatly stacked in a row, no slider needed */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {merch.map((item) => (
              <MerchCard key={item.id} item={item} />
            ))}
          </div>

          {(totalCount > merch.length || paystackHint) && (
            <div className="mt-6 text-center space-y-1">
              {totalCount > merch.length && (
                <p className="text-xs text-gray-400">
                  Showing {merch.length} of {totalCount} items —{" "}
                  <Link href={`/event/${eventId}/shop`} className="text-[#6b2fa5] font-medium hover:underline">
                    view all
                  </Link>
                </p>
              )}
              {paystackHint && (
                <p className="text-xs text-gray-400">
                  Prices include Spotix&apos;s merch fee where applicable — Paystack&apos;s processing fee is
                  added at checkout.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default MerchSection
