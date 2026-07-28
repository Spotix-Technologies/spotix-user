import { Flag } from "lucide-react"

export function SuspendedBanner() {
  return (
    <div className="mb-8 p-6 rounded-2xl bg-red-50 border-l-4 border-red-600 shadow">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Flag className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <p className="font-bold text-red-900 text-lg">This poll has been suspended by Spotix</p>
          <p className="text-red-700 text-sm mt-1">
            This poll is currently unavailable due to a policy violation or investigation.
            Voting and payouts are disabled. If you believe this is an error, please contact Spotix support.
          </p>
        </div>
      </div>
    </div>
  )
}
