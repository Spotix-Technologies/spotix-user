import type { Metadata } from "next"
import { getPollByName } from "@/app/lib/voting-utils"
import { cookies } from "next/headers"
import { verifyAccessToken, COOKIE_ACCESS_TOKEN } from "@/app/lib/auth-tokens"
import PollClient  from "./pollClient"
import UserHeader  from "@/components/UserHeader"
import Footer      from "@/components/footer"

interface Props {
  params: Promise<{ "poll-name": string }>
}

/**
 * Resolve the logged-in user's uid (if any) from the real session cookie.
 *
 * Previously this checked a Firebase session cookie called "session" —
 * but nothing in the app ever sets that cookie (only logout clears it),
 * so this always returned null and every voter was treated as a guest
 * regardless of login state. The actual session lives in the JWT
 * "spotix_u_at" cookie set by POST /api/v1/auth, verified the same way
 * the booker portal verifies its own "spotix_at" cookie.
 */
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token        = cookieStore.get(COOKIE_ACCESS_TOKEN)?.value
    if (!token) return null
    const payload = await verifyAccessToken(token, "spotix-user")
    return payload.uid
  } catch {
    return null
  }
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
  const userId      = await getUserIdFromSession()

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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <UserHeader />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <PollClient pollData={result.pollData} voteId={result.voteId} userId={userId} />
      </main>
      <Footer />
    </div>
  )
}
