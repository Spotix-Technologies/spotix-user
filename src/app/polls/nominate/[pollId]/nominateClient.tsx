"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { CategoryTabs, type NominationCategory } from "./components/CategoryTabs"
import { NominationForm } from "./components/NominationForm"
import { NomineeList } from "./components/NomineeList"
import { SharedNomineeSheet } from "./components/SharedNomineeSheet"
import { useDeviceId, hasNominatedLocally, markNominatedLocally } from "./hooks/useDeviceId"

interface NominationPoll {
  pollId: string
  pollName: string
  pollImage: string
  pollDescription: string
  categories: NominationCategory[]
  status: "active" | "closed"
}

interface Nominee {
  nomineeId: string
  name: string
  count: number
}

export default function NominateClient({ pollId }: { pollId: string }) {
  const deviceId = useDeviceId()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [poll, setPoll] = useState<NominationPoll | null>(null)
  const [pollLoading, setPollLoading] = useState(true)
  const [pollError, setPollError] = useState<string | null>(null)

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [nominees, setNominees] = useState<Nominee[]>([])
  const [nomineesLoading, setNomineesLoading] = useState(false)

  // Tracks which specific nomination is in-flight: "form" for the free-text
  // form, "sheet" for the shared-link bottom sheet, or the nominee's name
  // when a "Nominate" button on an existing card was clicked.
  const [submittingKey, setSubmittingKey] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Bumped locally so the UI reflects "already nominated" the instant a
  // submission succeeds, without waiting on a re-fetch.
  const [locallyNominatedCategoryIds, setLocallyNominatedCategoryIds] = useState<Set<string>>(new Set())

  // Shared-link deep dive: ?cat=<categoryId>&contestant=<nomineeId>
  const sharedCategoryId = searchParams.get("cat")
  const sharedNomineeId = searchParams.get("contestant")
  const [sheetDismissed, setSheetDismissed] = useState(false)

  // ── Fetch poll metadata ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const res = await fetch(`/api/v1/polls/nominations/${pollId}`)
        const data = await res.json()
        if (!res.ok) {
          setPollError(data.error || "Failed to load nomination poll")
          return
        }
        setPoll(data.poll)

        // Prefer the category referenced by a shared link, if it's valid.
        const categories: NominationCategory[] = data.poll.categories ?? []
        const fromLink = sharedCategoryId && categories.some((c) => c.categoryId === sharedCategoryId)
          ? sharedCategoryId
          : null
        setActiveCategoryId(fromLink ?? categories[0]?.categoryId ?? null)
      } catch {
        setPollError("An unexpected error occurred while loading this poll.")
      } finally {
        setPollLoading(false)
      }
    }
    fetchPoll()
  }, [pollId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch nominees for the active category ─────────────────────────────
  const fetchNominees = useCallback(async () => {
    if (!activeCategoryId) return
    setNomineesLoading(true)
    try {
      const res = await fetch(
        `/api/v1/polls/nominations/${pollId}/nominees?categoryId=${activeCategoryId}`
      )
      const data = await res.json()
      if (res.ok) setNominees(data.nominees ?? [])
    } catch {
      // Non-fatal — leave the previous list in place
    } finally {
      setNomineesLoading(false)
    }
  }, [pollId, activeCategoryId])

  useEffect(() => {
    fetchNominees()
    setFormError(null)
  }, [fetchNominees])

  const isCategoryNominated = (categoryId: string | null) =>
    !!categoryId && (hasNominatedLocally(pollId, categoryId) || locallyNominatedCategoryIds.has(categoryId))

  const submitNomination = async (name: string, key: string, categoryIdOverride?: string) => {
    const categoryId = categoryIdOverride ?? activeCategoryId
    if (!categoryId || !deviceId) return
    setSubmittingKey(key)
    setFormError(null)

    try {
      const res = await fetch("/api/v1/polls/nominate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, categoryId, name, deviceId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || "Failed to submit nomination.")
        return
      }

      markNominatedLocally(pollId, categoryId)
      setLocallyNominatedCategoryIds((prev) => new Set(prev).add(categoryId))
      fetchNominees()
    } catch {
      setFormError("An unexpected error occurred. Please try again.")
    } finally {
      setSubmittingKey(null)
    }
  }

  // Strips ?contestant= (keeps ?cat=) once the shared-link flow is done.
  const clearContestantParam = () => {
    setSheetDismissed(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("contestant")
    router.replace(params.toString() ? `?${params.toString()}` : `/polls/nominate/${pollId}`, { scroll: false })
  }

  if (pollLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#6b2fa5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (pollError || !poll) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-slate-700 font-semibold">{pollError || "Nomination poll not found"}</p>
          <Link href="/vote" className="text-[#6b2fa5] text-sm mt-2 inline-block">
            ← Back to Polls
          </Link>
        </div>
      </div>
    )
  }

  const activeCategory = poll.categories.find((c) => c.categoryId === activeCategoryId)
  const categoryNominated = isCategoryNominated(activeCategoryId)

  // Resolve the shared nominee once its category's list has loaded.
  const sharedNominee =
    !sheetDismissed && sharedNomineeId && activeCategoryId === sharedCategoryId
      ? nominees.find((n) => n.nomineeId === sharedNomineeId) ?? null
      : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white/80 rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 mb-6">
        <div className="mb-5 h-40 sm:h-56 rounded-xl overflow-hidden bg-slate-100">
          <img src={poll.pollImage || "/placeholder.svg"} alt={poll.pollName} className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{poll.pollName}</h1>
        {poll.pollDescription && <p className="text-slate-600 mb-1">{poll.pollDescription}</p>}
        {poll.status === "closed" && (
          <p className="mt-3 inline-block px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
            Nominations closed
          </p>
        )}
      </div>

      <div className="mb-4">
        <CategoryTabs
          categories={poll.categories}
          activeCategoryId={activeCategoryId}
          onSelect={setActiveCategoryId}
        />
      </div>

      {activeCategory && poll.status === "active" && (
        <div className="mb-6">
          <NominationForm
            categoryName={activeCategory.name}
            alreadyNominated={categoryNominated}
            submitting={submittingKey === "form"}
            error={formError}
            onSubmit={(name) => submitNomination(name, "form")}
          />
        </div>
      )}

      <h2 className="text-lg font-bold text-slate-900 mb-3">
        Nominees {activeCategory ? `for ${activeCategory.name}` : ""}
      </h2>
      {activeCategory && (
        <NomineeList
          nominees={nominees}
          loading={nomineesLoading}
          pollId={pollId}
          categoryId={activeCategory.categoryId}
          categoryName={activeCategory.name}
          onNominate={(name) => submitNomination(name, name)}
          nominatingName={submittingKey !== "form" && submittingKey !== "sheet" ? submittingKey : null}
          alreadyNominated={categoryNominated || poll.status !== "active"}
        />
      )}

      {sharedNominee && activeCategory && (
        <SharedNomineeSheet
          nominee={sharedNominee}
          categoryName={activeCategory.name}
          submitting={submittingKey === "sheet"}
          alreadyNominated={categoryNominated || poll.status !== "active"}
          onNominate={async () => {
            await submitNomination(sharedNominee.name, "sheet", activeCategory.categoryId)
            clearContestantParam()
          }}
          onClose={clearContestantParam}
        />
      )}
    </div>
  )
}
