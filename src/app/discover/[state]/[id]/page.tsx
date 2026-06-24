import type { Metadata } from "next"
import { adminDb } from "@/app/lib/firebase-admin"
import DiscoverDetailClient from "./detail-client"

interface Props {
  params: Promise<{ state: string; id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, id } = await params
  try {
    const snap = await adminDb
      .collection("discover").doc(decodeURIComponent(state))
      .collection("events").doc(id).get()
    if (snap.exists) {
      const d = snap.data()!
      return {
        title: `${d.eventName} | Spotix Discover`,
        description: d.description || `${d.eventName} in ${d.state}`,
        openGraph: { images: [{ url: d.imageUrl }] },
      }
    }
  } catch { /* fallback */ }
  return { title: "Event | Spotix Discover" }
}

export default async function DiscoverDetailPage({ params }: Props) {
  const { state, id } = await params
  return <DiscoverDetailClient state={decodeURIComponent(state)} id={id} />
}
