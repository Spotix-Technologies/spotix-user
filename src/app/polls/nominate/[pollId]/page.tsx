import type { Metadata } from "next"
import { Suspense } from "react"
import NominateClient from "./nominateClient"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"
import { adminDb } from "@/app/lib/firebase-admin"
import { cacheGet, cacheSet } from "@/app/lib/redis"

interface Props {
  params: Promise<{ pollId: string }>
}

interface NominationPollOgData {
  pollName: string
  pollImage: string
  pollDescription: string
}

const CACHE_TTL_SECONDS = 60
const DEFAULT_DESCRIPTION = "Nominate a candidate for this open-nomination poll on Spotix."

/**
 * Resolves OG data (pollName, pollImage, pollDescription) for a nomination
 * poll's share link. Reads the SAME cache key/shape as
 * /api/v1/polls/nominations/[pollId], so this only hits Firestore on a
 * genuine cache miss — a shared link being unfurled by a bot doesn't cost
 * an extra read if a real visit (or another unfurl) already warmed it.
 */
async function getNominationPollOgData(pollId: string): Promise<NominationPollOgData | null> {
  const cacheKey = `nomination-poll:${pollId}`

  const cached = await cacheGet<Record<string, unknown>>(cacheKey)
  if (cached) {
    return {
      pollName: (cached.pollName as string) ?? "",
      pollImage: (cached.pollImage as string) ?? "",
      pollDescription: (cached.pollDescription as string) ?? "",
    }
  }

  try {
    const snap = await adminDb.collection("nominationPolls").doc(pollId).get()
    if (!snap.exists) return null

    const d = snap.data()!
    // Mirror the exact shape /api/v1/polls/nominations/[pollId] caches, so
    // whichever of the two resolves first primes the cache for the other.
    const poll = {
      pollId: snap.id,
      pollName: d.pollName ?? "",
      pollImage: d.pollImage ?? "",
      pollDescription: d.pollDescription ?? "",
      categories: d.categories ?? [],
      status: d.status ?? "active",
    }

    await cacheSet(cacheKey, poll, CACHE_TTL_SECONDS)

    return {
      pollName: poll.pollName,
      pollImage: poll.pollImage,
      pollDescription: poll.pollDescription,
    }
  } catch (err) {
    console.error("[polls/nominate/[pollId]] Failed to resolve OG data:", err)
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pollId } = await params
  const canonical = `/polls/nominate/${pollId}`
  const og = await getNominationPollOgData(pollId)

  if (!og || !og.pollName) {
    return {
      title: "Nominations",
      description: DEFAULT_DESCRIPTION,
      alternates: { canonical },
    }
  }

  const title = og.pollName
  // pollDescription isn't guaranteed to be set on every nomination poll —
  // fall back to a generic description rather than leaving it blank.
  const description = og.pollDescription?.trim() || DEFAULT_DESCRIPTION
  const images = og.pollImage ? [{ url: og.pollImage, width: 1200, height: 630, alt: title }] : undefined

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: og.pollImage ? [og.pollImage] : undefined,
    },
  }
}

export default async function NominatePage({ params }: Props) {
  const { pollId } = await params

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <UserHeader />
      <Suspense fallback={<div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-[#6b2fa5] border-t-transparent rounded-full animate-spin" /></div>}>
        <NominateClient pollId={pollId} />
      </Suspense>
      <Footer />
    </div>
  )
}
