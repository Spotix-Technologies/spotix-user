import type { Metadata } from "next"
import HomePageClient from "./page-client"

export const metadata: Metadata = {
  title: "Home",
  description: "View a variety of events on Nigeria's premier event management platform.",
  keywords: [
    "Spotix Home",
    "sign in Spotix",
    "event management login",
    "ticket booking login Nigeria",
    "Spotix account access",
  ],
  openGraph: {
    title: "Home",
    description: "View a list of events happening on Spotix. Get tickets today!",
    url: "https://spotix.com.ng/home",
    siteName: "Spotix Nigeria",
    type: "website",
    images: [
      {
        url: "https://i.postimg.cc/FR5xpcpZ/hero.jpg",
        width: 1200,
        height: 630,
        alt: "Spotix Home - Explore Events",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Home",
    description: "View a list of events happening on Spotix. Get tickets today!",
    images: ["https://i.postimg.cc/FR5xpcpZ/hero.jpg"],
  },
  alternates: {
    canonical: "https://spotix.com.ng/home",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function HomePage() {
  return <HomePageClient />
}
