import type { Metadata } from "next"
import ProfilePageClient from "./page-client"

export const metadata: Metadata = {
  title: "Profile",
  description: "View and manage your profile on Spotix",
  keywords: [
    "Spotix Profile",
    "Spotix User Profile",
    "Spotix Profile Management",
    "Account Settings Spotix",
    "Spotix User Account",
  ],
  openGraph: {
    title: "Profile",
    description: "View and manage your profile on Spotix",
    url: "https://spotix.com.ng/profile",
    siteName: "Spotix Nigeria",
    type: "website",
    images: [
      {
        url: "https://i.postimg.cc/FR5xpcpZ/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Spotix Profile - Manage Your Account",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Profile",
    description: "View and manage your profile on Spotix",
    images: ["https://i.postimg.cc/FR5xpcpZ/hero.jpg"],
  },
  alternates: {
    canonical: "https://spotix.com.ng/profile",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function ProfilePage() {
  return <ProfilePageClient />
}