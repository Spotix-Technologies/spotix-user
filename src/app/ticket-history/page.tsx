import type { Metadata } from "next"
import TicketHistoryPageClient from "./page-client"

export const metadata: Metadata = {
  title: "Ticket History",
  description: "View and manage your ticket history. Track all your purchased tickets and their details.",
  keywords: [
    "Spotix referrals",
    "earn money referring friends",
    "referral program Nigeria",
    "event platform rewards",
    "invite friends earn money",
    "Spotix referral code",
    "referral earnings",
  ],
  openGraph: {
    title: "Ticket History",
    description: "View and manage your ticket history. Track all your purchased tickets and their details.",
    url: "https://spotix.com.ng/ticket-history",
    siteName: "Spotix Nigeria",
    type: "website",
    images: [
      {
        url: "https://i.postimg.cc/FR5xpcpZ/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Spotix Ticket History - View Your Purchases",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ticket History",
    description: "View and manage your ticket history. Track all your purchased tickets and their details.",
    images: ["https://i.postimg.cc/FR5xpcpZ/hero.jpg"],
  },
  alternates: {
    canonical: "https://spotix.com.ng/ticket-history",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function TicketHistoryPage() {
  return <TicketHistoryPageClient />
}
