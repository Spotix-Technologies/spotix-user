"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/app/lib/firebase"
import { collection, getDocs, query, orderBy } from "firebase/firestore"
import { ArrowLeft, RefreshCw, Clock, CheckCircle, XCircle, AlertTriangle, Mail } from "lucide-react"
import UserHeader from "../../components/UserHeader"
import Footer from "../../components/footer"

interface RefundItem {
  id: string
  refundId: string
  eventName: string
  ticketPrice: number
  status: "requested" | "processing" | "refunded" | "denied"
  requestDate: string
  requestTime: string
  refundReason: string
  customReason?: string
  moreInformation?: string
  ticketId: string
  ticketReference: string
  eventId: string
  userId: string
  userEmail: string
}

export default function RefundTrack() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refunds, setRefunds] = useState<RefundItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRefunds()
  }, [])

  const fetchRefunds = async (isRefresh = false) => {
    try {
      const user = auth.currentUser
      if (!user) {
        router.push("/auth/login")
        return
      }

      setError(null)
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const refundsCollectionRef = collection(db, "TicketHistory", user.uid, "refunds")
      const refundsQuery = query(refundsCollectionRef, orderBy("requestDate", "desc"))
      const refundsSnapshot = await getDocs(refundsQuery)

      const refundsList: RefundItem[] = []
      refundsSnapshot.forEach((doc) => {
        const data = doc.data()

        let requestDate = "N/A"
        let requestTime = "N/A"

        if (data.requestDate) {
          if (typeof data.requestDate === "string") {
            const date = new Date(data.requestDate)
            requestDate = date.toLocaleDateString()
            requestTime = data.requestTime || date.toLocaleTimeString()
          } else if (data.requestDate.toDate) {
            const date = data.requestDate.toDate()
            requestDate = date.toLocaleDateString()
            requestTime = date.toLocaleTimeString()
          }
        }

        refundsList.push({
          id: doc.id,
          refundId: data.refundId || doc.id,
          eventName: data.eventName || "Unknown Event",
          ticketPrice: data.ticketPrice || 0,
          status: data.status || "requested",
          requestDate: requestDate,
          requestTime: requestTime,
          refundReason: data.refundReason || "",
          customReason: data.customReason || "",
          moreInformation: data.moreInformation || "",
          ticketId: data.ticketId || "",
          ticketReference: data.ticketReference || "",
          eventId: data.eventId || "",
          userId: data.userId || "",
          userEmail: data.userEmail || "",
        })
      })

      setRefunds(refundsList)
    } catch (err) {
      console.error("  Error fetching refunds:", err)
      setError("Failed to load refund history. Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "requested":
        return {
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          badgeBg: "bg-blue-100",
          badgeText: "text-blue-700",
          icon: <Clock size={16} className="text-blue-600" />,
          text: "Requested",
          description: "Your refund request is pending review. Please check back later",
        }
      case "processing":
        return {
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          badgeBg: "bg-yellow-100",
          badgeText: "text-yellow-700",
          icon: <RefreshCw size={16} className="text-yellow-600 animate-spin" />,
          text: "Processing",
          description: "Your refund is being processed",
        }
      case "refunded":
        return {
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          badgeBg: "bg-green-100",
          badgeText: "text-green-700",
          icon: <CheckCircle size={16} className="text-green-600" />,
          text: "Refunded",
          description: "Your refund has been completed successfully",
        }
      case "denied":
        return {
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          badgeBg: "bg-red-100",
          badgeText: "text-red-700",
          icon: <XCircle size={16} className="text-red-600" />,
          text: "Denied",
          description: "Oh, it seems your refund request wasn't approved, please contact us",
        }
      default:
        return {
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          badgeBg: "bg-gray-100",
          badgeText: "text-gray-700",
          icon: <AlertTriangle size={16} className="text-gray-600" />,
          text: "Unknown",
          description: "Status unknown",
        }
    }
  }

  const handleContactSupport = () => {
    window.open("mailto:support@spotix.com.ng?subject=Refund Request Support", "_blank")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading refund history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <UserHeader />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-4 font-medium"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Track Refunds</h1>
            <p className="text-gray-600 mt-1">Monitor the status of all your refund requests</p>
          </div>
          <button
            onClick={() => fetchRefunds(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800">{error}</p>
            </div>
            <button onClick={() => fetchRefunds(true)} className="text-red-600 hover:text-red-700 font-medium text-sm">
              Try Again
            </button>
          </div>
        )}

        {/* Refunds List */}
        {refunds.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <RefreshCw size={32} className="text-gray-400" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Refund Requests</h3>
            <p className="text-gray-600 mb-6">You haven't made any refund requests yet.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push("/refund")}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
              >
                Request Refund
              </button>
              <button
                onClick={() => router.push("/ticket-history")}
                className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                View Tickets
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {refunds.map((refund) => {
              const statusConfig = getStatusConfig(refund.status)
              return (
                <div
                  key={refund.id}
                  className={`${statusConfig.bgColor} border-2 ${statusConfig.borderColor} rounded-lg p-6`}
                >
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Refund ID</p>
                      <p className="font-mono text-sm font-medium text-gray-900">{refund.refundId}</p>
                    </div>
                    <div
                      className={`inline-flex items-center gap-2 px-3 py-1 ${statusConfig.badgeBg} ${statusConfig.badgeText} rounded-full`}
                    >
                      {statusConfig.icon}
                      <span className="font-medium text-sm">{statusConfig.text}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{refund.eventName}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Refundable Amount</p>
                        <p className="text-lg font-semibold text-gray-900">₦{formatNumber(refund.ticketPrice)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Request Date</p>
                        <p className="font-medium text-gray-900">{refund.requestDate}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-600 mb-1">Reason</p>
                      <p className="font-medium text-gray-900">
                        {refund.refundReason === "Other" && refund.customReason
                          ? refund.customReason
                          : refund.refundReason}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4 p-3 bg-white bg-opacity-50 rounded border border-current border-opacity-10">
                    <p className="text-sm text-gray-700">{statusConfig.description}</p>
                  </div>

                  {/* Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-current border-opacity-20">
                    <p className="text-xs text-gray-600">Ticket Ref: {refund.ticketReference}</p>
                    {refund.status === "denied" && (
                      <button
                        onClick={handleContactSupport}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                      >
                        <Mail size={16} />
                        Contact Support
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary Stats */}
        {refunds.length > 0 && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{refunds.length}</p>
              <p className="text-sm text-gray-600">Total Requests</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">
                {refunds.filter((r) => r.status === "requested").length}
              </p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {refunds.filter((r) => r.status === "processing").length}
              </p>
              <p className="text-sm text-gray-600">Processing</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {refunds.filter((r) => r.status === "refunded").length}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{refunds.filter((r) => r.status === "denied").length}</p>
              <p className="text-sm text-gray-600">Denied</p>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
