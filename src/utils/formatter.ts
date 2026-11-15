/**
 * Formats a number with thousands separators.
 * Accepts numeric strings too — ticket prices are sometimes stored as strings
 * in Firestore, and `"300000".toLocaleString()` returns "300000" unformatted.
 */
export const formatNumber = (num: number | string): string => {
  const n = Number(num)
  return Number.isFinite(n) ? n.toLocaleString() : "0"
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
