interface AttendeeInfoBlockProps {
  fullName: string
  email: string
  isGuest: boolean
}

/** "Attendee Information" section — name, email, and a guest-purchase badge when applicable. */
export default function AttendeeInfoBlock({ fullName, email, isGuest }: AttendeeInfoBlockProps) {
  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Attendee Information</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 mb-1">Name</p>
          <p className="text-lg font-semibold text-gray-900">{fullName || "—"}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-1">Email</p>
          <p className="text-lg font-semibold text-gray-900">{email}</p>
        </div>
        {isGuest && (
          <div className="md:col-span-2">
            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full">
              👤 Guest Purchase
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
