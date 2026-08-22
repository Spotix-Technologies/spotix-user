"use client"

import { Users, X, ChevronDown } from "lucide-react"

interface ReferralData {
  code: string
}

interface ReferralCodeOption {
  code: string
}

interface ReferralProps {
  referralData: ReferralData | null
  referralCodes: ReferralCodeOption[]
  referralFetching: boolean
  referralError: string
  showReferralDropdown: boolean
  setShowReferralDropdown: (show: boolean) => void
  onSelectReferral: (code: string) => void
  onRemoveReferral: () => void
}

export default function Referral({
  referralData,
  referralCodes,
  referralFetching,
  referralError,
  showReferralDropdown,
  setShowReferralDropdown,
  onSelectReferral,
  onRemoveReferral,
}: ReferralProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-4 sm:p-6 w-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-100 flex-shrink-0">
          <Users size={16} style={{ color: "#6b2fa5" }} />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">Referral Code (Optional)</h3>
      </div>

      {referralData ? (
        <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl bg-purple-50 border-2 border-purple-200">
          <div className="min-w-0 flex-1 pr-2">
            <p className="font-bold text-sm sm:text-base text-purple-700 break-words">{referralData.code}</p>
            <p className="text-xs sm:text-sm text-purple-600">Selected</p>
          </div>
          <button onClick={onRemoveReferral} className="p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-red-600" />
          </button>
        </div>
      ) : (
        <div>
          {referralFetching ? (
            <div className="flex items-center justify-center py-8">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-purple-500 border-r-transparent"></div>
              <span className="ml-2 text-sm sm:text-base text-gray-600">Loading referral codes...</span>
            </div>
          ) : referralCodes.length === 0 ? (
            <p className="text-gray-500 text-center py-4 text-sm sm:text-base">No referral codes available</p>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowReferralDropdown(!showReferralDropdown)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-left bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <span className="text-gray-600 break-words pr-2">Select a referral code...</span>
                <ChevronDown
                  size={18}
                  className={`transition-transform flex-shrink-0 ${showReferralDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showReferralDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-10">
                  <div className="max-h-48 overflow-y-auto">
                    {referralCodes.map((referral) => (
                      <button
                        key={referral.code}
                        onClick={() => onSelectReferral(referral.code)}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-left hover:bg-purple-50 border-b border-gray-100 last:border-b-0 font-medium text-gray-700 transition-colors break-words"
                      >
                        {referral.code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {referralError && (
        <p className="text-red-600 text-xs sm:text-sm mt-2 flex items-center gap-1">
          <X size={14} className="flex-shrink-0" />
          <span className="break-words">{referralError}</span>
        </p>
      )}
    </div>
  )
}