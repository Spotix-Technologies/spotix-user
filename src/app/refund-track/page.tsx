import type { Metadata } from "next"
import RefundTrackPageClient from "./page-client"

export const metadata: Metadata = {
  title: "Track Refund",
  description: "Track the status of your refund requests. Monitor your refund progress in real-time.",
  keywords: [
    "Spotix refund track",
    "track refund",
    "refund status",
    "refund tracking",
    "Spotix refund status",
  ],
  openGraph: {
    title: "Track Refund",
    description: "Track the status of your refund requests",
    url: "https://spotix.com.ng/refund-track",
    siteName: "Spotix Nigeria",
    type: "website",
  },
}

export default function RefundTrackPage() {
  return <RefundTrackPageClient />
}
