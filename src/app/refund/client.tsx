"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/app/lib/firebase"
import { collection, getDocs, query, orderBy, addDoc, doc, setDoc, getDoc } from "firebase/firestore"
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Calendar, Clock, Tag } from "lucide-react"
import UserHeader from "../../components/UserHeader"
import Footer from "../../components/footer"

interface TicketItem {
  id: string
  eventId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  totalAmount: number
  ticketId: string
  ticketReference: string
  purchaseDate: string
  purchaseTime: string
  verified: boolean
  paymentMethod: string
}

interface RefundFormData {
  ticketId: string
  eventName: string
  ticketType: string
  ticketPrice: number
  purchaseDate: string
  reason: string
  customReason: string
  moreInformation: string
  agreedToPolicy: boolean
}

const refundReasons = [
  "I changed my mind",
  "I need the money back",
  "The event is likely a scam",
  "I purchased the wrong ticket",
  "I don't like the organizer",
  "Other",
]

export default function Refund() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null)
  const [showEligibilityDialog, setShowEligibilityDialog] = useState(false)
  const [eligibilityMessage, setEligibilityMessage] = useState("")
  const [isEligible, setIsEligible] = useState(false)
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const [formData, setFormData] = useState<RefundFormData>({
    ticketId: "",
    eventName: "",
    ticketType: "",
    ticketPrice: 0,
    purchaseDate: "",
    reason: "",
    customReason: "",
    moreInformation: "",
    agreedToPolicy: false,
  })
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

  useEffect(() => {
    fetchUserTickets()
  }, [])

  const fetchUserTickets = async () => {
    try {
      const user = auth.currentUser
      if (!user) {
        router.push("/auth/login")
        return
      }

      const ticketsCollectionRef = collection(db, "TicketHistory", user.uid, "tickets")
      const ticketsQuery = query(ticketsCollectionRef, orderBy("purchaseDate", "desc"))
      const ticketsSnapshot = await getDocs(ticketsQuery)

      const ticketsList: TicketItem[] = []
      ticketsSnapshot.forEach((doc) => {
        const data = doc.data()

        let purchaseDate = "N/A"
        let purchaseTime = "N/A"

        if (data.purchaseDate) {
          if (typeof data.purchaseDate === "string") {
            purchaseDate = data.purchaseDate
            purchaseTime = data.purchaseTime || "N/A"
          } else if (data.purchaseDate.toDate) {
            const date = data.purchaseDate.toDate()
            purchaseDate = date.toLocaleDateString()
            purchaseTime = date.toLocaleTimeString()
          }
        }

        ticketsList.push({
          id: doc.id,
          eventId: data.eventId || "",
          eventName: data.eventName || "Unknown Event",
          ticketType: data.ticketType || "Standard",
          ticketPrice: data.ticketPrice || 0,
          totalAmount: data.totalAmount || data.ticketPrice || 0,
          ticketId: data.ticketId || "",
          ticketReference: data.ticketReference || "",
          purchaseDate: purchaseDate,
          purchaseTime: purchaseTime,
          verified: data.verified || false,
          paymentMethod: data.paymentMethod || "Wallet",
        })
      })

      setTickets(ticketsList)
      setLoading(false)
    } catch (error) {
      console.error("  Error fetching tickets:", error)
      setLoading(false)
    }
  }

  const checkRefundEligibility = (ticket: TicketItem) => {
    const purchaseDate = new Date(ticket.purchaseDate)
    const currentDate = new Date()
    const daysDifference = Math.floor((currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDifference < 2) {
      const eligibleDate = new Date(purchaseDate)
      eligibleDate.setDate(eligibleDate.getDate() + 2)
      setEligibilityMessage(
        `You just purchased this ticket, it isn't eligible for refund till ${eligibleDate.toLocaleDateString()}.`,
      )
      setIsEligible(false)
    } else if (daysDifference >= 2 && daysDifference <= 7) {
      setIsEligible(true)
      return true
    } else {
      setEligibilityMessage("This ticket can no longer be refunded.")
      setIsEligible(false)
    }

    setShowEligibilityDialog(true)
    return false
  }

  const handleTicketSelect = (ticket: TicketItem) => {
    setSelectedTicket(ticket)

    if (checkRefundEligibility(ticket)) {
      setFormData({
        ticketId: ticket.ticketId,
        eventName: ticket.eventName,
        ticketType: ticket.ticketType,
        ticketPrice: ticket.totalAmount - 150,
        purchaseDate: ticket.purchaseDate,
        reason: "",
        customReason: "",
        moreInformation: "",
        agreedToPolicy: false,
      })
      setShowRefundForm(true)
    }
  }

  const handleSubmitRefund = async () => {
    if (!selectedTicket || !auth.currentUser) return

    if (!formData.reason) {
      alert("Please select a reason for refund")
      return
    }

    if (formData.reason === "Other" && !formData.customReason.trim()) {
      alert("Please provide a custom reason")
      return
    }

    if (!formData.agreedToPolicy) {
      alert("Please agree to the refund policy")
      return
    }

    setSubmitting(true)

    try {
      const user = auth.currentUser

      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)
      const userData = userDoc.exists() ? userDoc.data() : {}

      const refundData = {
        userId: user.uid,
        userEmail: user.email,
        ticketId: formData.ticketId,
        ticketReference: selectedTicket.ticketReference,
        eventId: selectedTicket.eventId,
        eventName: formData.eventName,
        ticketType: formData.ticketType,
        ticketPrice: formData.ticketPrice,
        purchaseDate: formData.purchaseDate,
        refundReason: formData.reason,
        customReason: formData.reason === "Other" ? formData.customReason : "",
        moreInformation: formData.moreInformation,
        status: "requested",
        requestDate: new Date().toISOString(),
        requestTime: new Date().toLocaleTimeString(),
        agreedToPolicy: formData.agreedToPolicy,
        paymentMethod: selectedTicket.paymentMethod,
      }

      const refundsCollectionRef = collection(db, "refunds")
      const refundDocRef = await addDoc(refundsCollectionRef, refundData)

      await setDoc(
        refundDocRef,
        {
          refundId: refundDocRef.id,
        },
        { merge: true },
      )

      const userRefundsRef = doc(db, "TicketHistory", user.uid, "refunds", refundDocRef.id)
      await setDoc(userRefundsRef, {
        ...refundData,
        refundId: refundDocRef.id,
      })

      // Send email notification
      await fetch(`${BACKEND_URL}/v1/notify/refund-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundId: refundDocRef.id,
          userEmail: user.email,
          userName: userData.fullName || userData.username || "User",
          eventName: formData.eventName,
          ticketType: formData.ticketType,
          ticketPrice: formData.ticketPrice,
          refundReason: formData.reason,
          customReason: formData.customReason,
          moreInformation: formData.moreInformation,
          ticketReference: selectedTicket.ticketReference,
          requestDate: new Date().toLocaleDateString(),
          requestTime: new Date().toLocaleTimeString(),
        }),
      })

      setSubmitSuccess(true)
      setShowRefundForm(false)
    } catch (error) {
      console.error("  Error submitting refund:", error)
      alert("Failed to submit refund request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your tickets...</p>
        </div>
      </div>
    )
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <UserHeader />
        <div className="flex-grow flex items-center justify-center px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle size={48} className="text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Refund Request Submitted</h2>
            <p className="text-gray-600 mb-6">Your refund request has been submitted successfully.</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Refund Amount:</strong> ₦{formatNumber(formData.ticketPrice)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Transaction Fee (Non-refundable):</strong> ₦150
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              We will review your request and process it within 3-5 business days. You will receive an email
              notification once your refund has been processed.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/ticket-history")}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
              >
                View My Tickets
              </button>
              <button
                onClick={() => router.push("/home")}
                className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <UserHeader />

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 font-medium"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Refund</h1>
          <p className="text-gray-600">
            Select a ticket to request a refund. Refunds are only available 2-7 days after purchase.
          </p>
        </div>

        {!showRefundForm ? (
          <>
            {/* Ticket Selection */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Ticket to Refund</h2>

            {tickets.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-600 mb-4">You don't have any tickets to refund.</p>
                <button
                  onClick={() => router.push("/home")}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                >
                  Browse Events
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => handleTicketSelect(ticket)}
                    className="bg-white rounded-lg shadow hover:shadow-lg transition-all cursor-pointer p-6 border border-gray-200 hover:border-purple-300"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{ticket.eventName}</h3>
                    <p className="text-purple-600 font-medium mb-4">₦{formatNumber(ticket.totalAmount)}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Tag size={16} />
                        <span>{ticket.ticketType}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={16} />
                        <span>{ticket.purchaseDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={16} />
                        <span>{ticket.purchaseTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Ref: {ticket.ticketReference}</span>
                      {ticket.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle size={14} />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <XCircle size={14} />
                          Not Verified
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Refund Form */}
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Refund Request Form</h2>

            <div className="bg-white rounded-lg shadow p-8">
              {/* Ticket Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                    <input
                      type="text"
                      value={formData.eventName}
                      disabled
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Type</label>
                    <input
                      type="text"
                      value={formData.ticketType}
                      disabled
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ticket Price</label>
                    <input
                      type="text"
                      value={`₦${formatNumber(formData.ticketPrice)}`}
                      disabled
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                    <input
                      type="text"
                      value={formData.purchaseDate}
                      disabled
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
                    />
                  </div>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> The ₦150 transaction fee is non-refundable. Only the ticket price of ₦
                    {formatNumber(formData.ticketPrice)} will be refunded.
                  </p>
                </div>
              </div>

              {/* Refund Reason */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Refund Reason</h3>
                <div className="space-y-3">
                  {refundReasons.map((reason) => (
                    <label
                      key={reason}
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason}
                        checked={formData.reason === reason}
                        onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value, customReason: "" }))}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-gray-700">{reason}</span>
                    </label>
                  ))}
                </div>

                {formData.reason === "Other" && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Custom Reason *</label>
                    <input
                      type="text"
                      placeholder="Please specify your reason"
                      value={formData.customReason}
                      onChange={(e) => setFormData((prev) => ({ ...prev, customReason: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  More Information About the Refund
                </label>
                <textarea
                  placeholder="Spotix may contact you for more details about your refund, you can fill it now and we won't contact you for more details before processing refunds."
                  value={formData.moreInformation}
                  onChange={(e) => setFormData((prev) => ({ ...prev, moreInformation: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              {/* Policy Agreement */}
              <div className="mb-8">
                <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={formData.agreedToPolicy}
                    onChange={(e) => setFormData((prev) => ({ ...prev, agreedToPolicy: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    You agree to have read our{" "}
                    <a
                      href="https://my.spotix.com.ng/refunds"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline"
                    >
                      Refunds Policy
                    </a>{" "}
                    and we will process your refunds accordingly.
                  </span>
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRefundForm(false)
                    setSelectedTicket(null)
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                {formData.agreedToPolicy && (
                  <button
                    onClick={handleSubmitRefund}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {submitting ? "Submitting..." : "Submit Refund Request"}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Eligibility Dialog */}
      {showEligibilityDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${isEligible ? "bg-green-100" : "bg-yellow-100"}`}>
                {isEligible ? (
                  <CheckCircle size={24} className="text-green-600" />
                ) : (
                  <AlertTriangle size={24} className="text-yellow-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isEligible ? "Refund Eligible" : "Refund Not Available"}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">{eligibilityMessage}</p>
            <button
              onClick={() => setShowEligibilityDialog(false)}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
            >
              OK, I Understand
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
