"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ShoppingBag } from "lucide-react"

interface Merch {
  id: string
  productName: string
  description: string
  price: number
  images: string[]
}

interface MerchSectionProps {
  eventId: string
  creatorId: string
}

export default function MerchSection({ eventId, creatorId }: MerchSectionProps) {
  const [merch, setMerch] = useState<Merch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEventMerch = async () => {
      try {
        const response = await fetch(`/api/v1/event/merch?creatorId=${creatorId}&eventId=${eventId}`)
        
        if (!response.ok) {
          throw new Error("Failed to fetch merchandise")
        }

        const result = await response.json()
        
        if (result.success) {
          setMerch(result.data)
        }
      } catch (error) {
        console.error("Error fetching event merchandise:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEventMerch()
  }, [eventId, creatorId])

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(price)
      .replace("NGN", "₦")
      .trim()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 mb-8">
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#6b2fa5] border-r-transparent mb-4"></div>
          <p className="text-gray-600">Loading merchandise...</p>
        </div>
      </div>
    )
  }

  if (merch.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag size={24} className="text-[#6b2fa5]" />
        <h2 className="text-2xl font-bold text-gray-900">Event Merchandise</h2>
        <span className="ml-auto px-3 py-1 bg-purple-100 text-[#6b2fa5] text-sm font-semibold rounded-full">
          {merch.length} {merch.length === 1 ? "Item" : "Items"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {merch.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Image */}
            {item.images && item.images.length > 0 && (
              <div className="relative w-full h-48 bg-gray-100">
                <Image
                  src={item.images[0] || "/placeholder.svg"}
                  alt={item.productName}
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 mb-2 truncate" title={item.productName}>
                {item.productName}
              </h3>
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>

              <div className="flex items-center justify-between">
                <p className="text-lg sm:text-xl font-bold text-[#6b2fa5]">{formatPrice(item.price)}</p>
                <button className="px-4 py-2 bg-[#6b2fa5] text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
                  Order
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}