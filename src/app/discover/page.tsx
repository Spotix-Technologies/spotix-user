import type { Metadata } from "next"
import DiscoverPageClient from "./page-client"

export const metadata: Metadata = {
  title: "Discover Events",
  description: "Discover events happening across Nigeria. Find music, tech, arts, sports and more events near you.",
  openGraph: {
    title: "Discover Events in Nigeria | Spotix",
    description: "Find events happening in your state and across Nigeria.",
    url: "https://spotix.com.ng/discover",
    siteName: "Spotix Nigeria",
    type: "website",
  },
  alternates: { canonical: "https://spotix.com.ng/discover" },
}

export default function DiscoverPage() {
  return <DiscoverPageClient />
}
