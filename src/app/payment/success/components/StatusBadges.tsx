interface StatusBadgesProps {
  isFreeTicket: boolean
  discountApplied: boolean
  referralUsed: boolean
}

/**
 * Free Event / Discount Applied / Referral Used pills. Free Event keeps
 * green (a genuine "success" signal), Discount and Referral now both sit
 * in the brand-purple family (filled vs. outline) instead of the old
 * yellow/blue pairing, matching the rest of the checkout flow.
 */
export default function StatusBadges({ isFreeTicket, discountApplied, referralUsed }: StatusBadgesProps) {
  if (!isFreeTicket && !discountApplied && !referralUsed) return null

  return (
    <div className="flex flex-wrap gap-2">
      {isFreeTicket && (
        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
          🎁 Free Event
        </span>
      )}
      {discountApplied && !isFreeTicket && (
        <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
          🎉 Discount Applied
        </span>
      )}
      {referralUsed && (
        <span className="px-3 py-1 bg-white border-2 border-purple-300 text-purple-700 text-sm font-semibold rounded-full">
          👥 Referral Used
        </span>
      )}
    </div>
  )
}
