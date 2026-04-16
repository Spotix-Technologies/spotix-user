import type { Metadata } from "next"
import ReferralsPageClient from "./page-client"

export const metadata: Metadata = {
  title: "Referrals",
  description: "Invite friends to Spotix and earn rewards. Share your referral code and get ₦200 for every friend who joins. Track your earnings and withdraw to your wallet.",
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
    title: "Referrals",
    description: "Invite friends to Spotix and earn rewards. Get ₦200 for every friend who joins using your referral code.",
    url: "https://spotix.com.ng/referrals",
    siteName: "Spotix Nigeria",
    type: "website",
    images: [
      {
        url: "https://i.postimg.cc/FR5xpcpZ/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Spotix Referrals - Earn Rewards",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Referrals",
    description: "Invite friends to Spotix and earn rewards. Get ₦200 for every friend who joins using your referral code.",
    images: ["https://i.postimg.cc/FR5xpcpZ/hero.jpg"],
  },
  alternates: {
    canonical: "https://spotix.com.ng/referrals",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function ReferralsPage() {
  return <ReferralsPageClient />
}
