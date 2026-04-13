import React from "react"
import { Mail, Phone, CheckCircle2, User } from "lucide-react"

interface BookerDetailsSectionProps {
  bookerDetails?: {
    username: string
    email: string
    phone: string
    isVerified: boolean
  } | null
  bookerName: string
  createdBy: string
}

const BookerDetailsSection: React.FC<BookerDetailsSectionProps> = ({
  bookerDetails,
  bookerName,
  createdBy,
}) => {
  // Use bookerDetails if available, otherwise use fallback data
  const displayName = bookerDetails?.username || bookerName || "Event Organizer"
  const displayEmail = bookerDetails?.email || ""
  const displayPhone = bookerDetails?.phone || ""
  const isVerified = bookerDetails?.isVerified || false

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 lg:p-8 border-2 border-purple-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Event Organizer</h3>
        {isVerified && (
          <div className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle2 size={14} />
            <span>Verified</span>
          </div>
        )}
      </div>

      {/* Organizer Info */}
      <div className="space-y-4">
        {/* Name */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#6b2fa5] to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={24} className="text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Organizer</p>
            <p className="font-semibold text-gray-900">{displayName}</p>
          </div>
        </div>

        {/* Contact Information */}
        {displayEmail && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Mail size={20} className="text-[#6b2fa5] flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Email</p>
              <a
                href={`mailto:${displayEmail}`}
                className="text-gray-900 font-medium hover:text-[#6b2fa5] transition-colors break-all"
              >
                {displayEmail}
              </a>
            </div>
          </div>
        )}

        {displayPhone && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Phone size={20} className="text-[#6b2fa5] flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Phone</p>
              <a
                href={`tel:${displayPhone}`}
                className="text-gray-900 font-medium hover:text-[#6b2fa5] transition-colors"
              >
                {displayPhone}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Info Message */}
      <div className="mt-6 p-4 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-200">
        <p>
          Contact the organizer directly for any questions about this event. {displayName} is committed
          to hosting an amazing experience.
        </p>
      </div>
    </div>
  )
}

export default BookerDetailsSection
