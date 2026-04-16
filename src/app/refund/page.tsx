import type { Metadata } from "next"
import RefundPageClient from "./page-client"

export const metadata: Metadata = {
  title: "Request Refund",
  description: "Request a refund for your tickets. Refunds are available 2-7 days after purchase.",
  keywords: [
    "Spotix refund",
    "ticket refund",
    "refund request",
    "refund policy",
    "Spotix refund policy",
  ],
  openGraph: {
    title: "Request Refund",
    description: "Request a refund for your tickets",
    url: "https://spotix.com.ng/refund",
    siteName: "Spotix Nigeria",
    type: "website",
  },
}

export default function RefundPage() {
  return <RefundPageClient />
}
