"use client"

import React, { useState, useEffect } from "react"
import { ShoppingCart, Loader } from "lucide-react"
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
  createdBy: string
}

const MerchSection: React.FC<MerchSectionProps> = ({ eventId, createdBy }) => {
  const [merch, setMerch] = useState<MerchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMerch, setSelectedMerch] = useState<Record<string, number>>({})
  const [cart, setCart] = useState<MerchItem[]>([])

  // Fetch merchandise
  useEffect(() => {
    const fetchMerch = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/v1/event/merch?eventId=${eventId}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setMerch(result.data)
          }
        }
      } catch (error) {
        console.error("Error fetching merchandise:", error)
        setError("Failed to load merchandise")
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      fetchMerch()
    }
  }, [eventId])

  const handleAddToCart = (item: MerchItem) => {
    setSelectedMerch((prev) => ({
      ...prev,
      [item.id]: (prev[item.id] || 0) + 1,
    }))
    setCart((prev) => [...prev, item])
  }

  const handleRemoveFromCart = (itemId: string) => {
    setSelectedMerch((prev) => {
      const newQuantity = Math.max(0, (prev[itemId] || 0) - 1)
      if (newQuantity === 0) {
        const { [itemId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [itemId]: newQuantity }
    })
    setCart((prev) => {
      const index = prev.findIndex((item) => item.id === itemId)
      if (index > -1) {
        return prev.filter((_, i) => i !== index)
      }
      return prev
    })
  }

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0)

  // Don't render section if no merch available
  if (!loading && merch.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 border-purple-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-gray-900">Event Merchandise</h3>
        {cart.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#6b2fa5] text-white rounded-full">
            <ShoppingCart size={18} />
            <span className="font-semibold">{cart.length}</span>
          </div>
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

      {/* Merch Grid */}
      {!loading && merch.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
            {merch.map((item) => {
              const quantity = selectedMerch[item.id] || 0
              return (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <div className="w-full h-48 bg-gray-200 overflow-hidden">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-1">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-bold text-[#6b2fa5]">
                        ₦{formatNumber(item.price)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {item.stock} {item.stock === 1 ? "left" : "available"}
                      </span>
                    </div>

                    {/* Add/Remove Buttons */}
                    {quantity === 0 ? (
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={item.stock === 0}
                        className="w-full py-2 px-3 bg-[#6b2fa5] text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <ShoppingCart size={16} />
                        Add to Cart
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="flex-1 py-2 px-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                        >
                          −
                        </button>
                        <div className="flex-1 py-2 px-3 bg-purple-50 text-[#6b2fa5] rounded-lg font-semibold text-center">
                          {quantity}
                        </div>
                        <button
                          onClick={() => handleAddToCart(item)}
                          disabled={quantity >= item.stock}
                          className="flex-1 py-2 px-3 bg-[#6b2fa5] text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-700">Total Merch Value:</span>
                <span className="text-2xl font-bold text-[#6b2fa5]">₦{formatNumber(totalPrice)}</span>
              </div>
              <button className="w-full py-3 px-4 bg-[#6b2fa5] text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                <ShoppingCart size={20} />
                Proceed to Checkout
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && merch.length === 0 && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500">No merchandise available for this event</p>
        </div>
      )}
    </div>
  )
}

export default MerchSection
