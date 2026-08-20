import type { Metadata } from "next"
import { getPollByName } from "@/app/lib/voting-utils"
import UserHeader  from "@/components/UserHeader"
import Footer      from "@/components/footer"
import PollsMovedNotice from "../PollsMovedNotice"

interface Props {
  params: Promise<{ "poll-name": string }>
}

/**
 * Polls & Nominations moved to the standalone Spotix Polls app. Build the
 * URL for a given poll on that app from SPOTIX_POLLS_URL. Returns undefined
 * if the env var isn't configured, so the notice can degrade gracefully
 * instead of redirecting to a broken URL.
 */
function buildPollsRedirectUrl(path: string): string | undefined {
  const base = process.env.SPOTIX_POLLS_URL
  if (!base) return undefined
  return `${base.replace(/\/+$/, "")}${path}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "poll-name": pollName } = await params
  const decodedName = decodeURIComponent(pollName)
  const result      = await getPollByName(decodedName)

  if (!result) {
    return { title: "Poll Not Found", description: "This poll does not exist" }
  }

  const { pollData } = result

  // If the poll is suspended, reflect that in metadata
  if (pollData.suspended) {
    return {
      title:       `${pollData.pollName} — Suspended`,
      description: "This poll has been suspended by Spotix and is currently unavailable.",
      openGraph: {
        title:       `${pollData.pollName} — Suspended`,
        description: "This poll has been suspended by Spotix and is currently unavailable.",
        images: [{ url: pollData.pollImage, width: 1200, height: 630 }],
      },
    }
  }

  return {
    title:       pollData.pollName,
    description: pollData.pollDescription,
    openGraph: {
      title:       pollData.pollName,
      description: pollData.pollDescription,
      images: [{ url: pollData.pollImage, width: 1200, height: 630 }],
    },
  }
}

export default async function PollPage({ params }: Props) {
  const { "poll-name": pollName } = await params
  const decodedName = decodeURIComponent(pollName)
  const result      = await getPollByName(decodedName)

  if (!result) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <UserHeader />
        <main className="flex-1 flex items-center justify-center max-w-6xl mx-auto w-full px-4 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Poll Not Found</h1>
            <p className="text-slate-600 mb-6">The poll you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            <a href="/home" className="inline-block px-6 py-2 bg-[#6b2fa5] text-white rounded-lg font-semibold hover:bg-[#5a1f8a] transition-colors">
              Back to Home
            </a>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const redirectUrl = buildPollsRedirectUrl(`/poll/${result.voteId}`)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <UserHeader />
      <PollsMovedNotice redirectUrl={redirectUrl} pollName={result.pollData.pollName} />
      <Footer />
    </div>
  )
}
