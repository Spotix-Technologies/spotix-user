// Pure, dependency-free poll helpers — pollType/status math, ID
// generation, name→key slugging. No Firestore, no Redis, nothing
// server-only.
//
// Split out of voting-utils.ts because pollClient.tsx (a "use client"
// component) imports getPollStatus() as a VALUE, not just a type. Type-
// only imports (`import type {...}`) get fully erased by the compiler,
// but a value import pulls the ENTIRE module — including every other
// top-level import in that file — into the browser bundle. Once
// voting-utils.ts started importing firebase-admin (see that file's
// header comment for why), that meant firebase-admin, google-auth-
// library, and Node builtins like `fs`/`child_process` all ended up in
// the client bundle too, which Turbopack can't resolve in a browser
// context: "Module not found: Can't resolve 'child_process'".
//
// This file is safe to import as VALUES from client components.
// voting-utils.ts re-exports everything here too, so server-side/type-
// only imports of these names don't need to change.
// Type-only import: erased at compile time, so pulling these type names
// from voting-utils.ts does NOT drag firebase-admin into the client
// bundle — only VALUE imports do that.
import type { VoteData, ContestantData, CategoryData } from "./voting-utils"
import type { TieBreakerState } from "./tie-breaker"

export type PollType = "single" | "group"
export type PollStatus = "active" | "ended" | "notStarted"

export function getPollStatus(
  startDate: string,
  startTime: string,
  endDate:   string,
  endTime:   string,
): PollStatus {
  const now   = new Date()
  const start = new Date(`${startDate}T${startTime}`)
  const end   = new Date(`${endDate}T${endTime}`)
  if (now < start) return "notStarted"
  if (now > end)   return "ended"
  return "active"
}

export function generateContestantId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let id = "sp-cont-"
  for (let i = 0; i < 10; i++) id += chars.charAt(Math.floor(Math.random() * chars.length))
  return id
}

export function generateCategoryId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let id = "sp-cat-"
  for (let i = 0; i < 10; i++) id += chars.charAt(Math.floor(Math.random() * chars.length))
  return id
}

export function pollNameToKey(pollName: string): string {
  return pollName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

/**
 * Resolves a shared contestant deep link (?contestant=<contestantId>) against
 * already-loaded poll data. Works for single polls (flat `contestants[]`)
 * and group polls, searching `categories` recursively through any depth of
 * `subcategories` since a shared link doesn't carry the category path.
 * Returns null if the id doesn't match anyone currently on the poll.
 */
export function findContestantInPoll(
  pollData: VoteData,
  contestantId: string,
): { contestant: ContestantData; category: CategoryData | null } | null {
  const direct = (pollData.contestants ?? []).find((c) => c.contestantId === contestantId)
  if (direct) return { contestant: direct, category: null }

  const searchCategories = (
    cats: CategoryData[],
  ): { contestant: ContestantData; category: CategoryData } | null => {
    for (const cat of cats) {
      const hit = (cat.contestants ?? []).find((c) => c.contestantId === contestantId)
      if (hit) return { contestant: hit, category: cat }
      if (cat.subcategories?.length) {
        const nested = searchCategories(cat.subcategories)
        if (nested) return nested
      }
    }
    return null
  }

  return searchCategories(pollData.categories ?? [])
}

/**
 * Same idea as resolveScopeOutcome, but walks a group poll's category tree
 * and returns one outcome per LEAF category (keyed by categoryId) in a
 * single pass — used by GroupPollSection/CategoryPanel instead of calling
 * resolveScopeOutcome per-category on every render.
 */
export function buildLeafOutcomes(
  categories: CategoryData[],
  pollStatus: PollStatus,
  tieBreakers: Record<string, TieBreakerState> | undefined,
  tieBreakerEnabled: boolean,
): Record<string, ScopeOutcome> {
  const map: Record<string, ScopeOutcome> = {}
  const walk = (cats: CategoryData[]) => {
    for (const cat of cats ?? []) {
      if (cat.subcategories && cat.subcategories.length > 0) {
        walk(cat.subcategories)
      } else {
        map[cat.categoryId] = resolveScopeOutcome(
          cat.contestants ?? [],
          pollStatus,
          tieBreakers?.[cat.categoryId] ?? null,
          tieBreakerEnabled,
        )
      }
    }
  }
  walk(categories ?? [])
  return map
}

/** Whether a specific contestant can currently receive a vote, given their scope's outcome. */
export function isContestantVotable(outcome: ScopeOutcome, contestantId: string): boolean {
  if (outcome.phase === "voting") return true
  if (outcome.phase === "tie-active" || outcome.phase === "tie-fptp") return outcome.contestantIds.includes(contestantId)
  return false
}

/**
 * What a single poll or a leaf category should show once voting is (or
 * isn't) over — winner, no-votes, or one of the tie-breaker phases. This
 * is purely a DISPLAY read of already-computed state (pollData.tieBreakers,
 * ticked server-side — see ./tie-breaker.ts's tickTieBreakers) — it never
 * decides tie-breaker outcomes itself, it only describes them.
 */
export type ScopeOutcome =
  | { phase: "voting" }
  | { phase: "not-started" }
  /** Poll/category ended with zero votes cast — nobody to crown. */
  | { phase: "no-votes" }
  /** A single contestant clearly has the top score (or a tie-breaker resolved it). */
  | { phase: "winner"; winnerId: string }
  /** Ended tied, but no tie-breaker is configured to resolve it. */
  | { phase: "tie-unresolved"; contestantIds: string[] }
  /** A timed tie-breaker round is open — only contestantIds are votable. */
  | { phase: "tie-active"; round: number; contestantIds: string[]; endsAt: string; isFinalRound: boolean }
  /**
   * Rounds are exhausted — whoever of contestantIds gets the next vote
   * wins. endsAt is the current FPTP window's deadline (same length as a
   * timed round); if it lapses with no vote the window silently renews,
   * so this can tick down and reset without ever becoming "closed".
   */
  | { phase: "tie-fptp"; round: number; contestantIds: string[]; endsAt: string | null }

export function resolveScopeOutcome(
  contestants: ContestantData[],
  pollStatus: PollStatus,
  tieBreakerState: TieBreakerState | null | undefined,
  tieBreakerEnabled: boolean,
): ScopeOutcome {
  if (pollStatus === "notStarted") return { phase: "not-started" }
  if (pollStatus === "active") return { phase: "voting" }

  // pollStatus === "ended" from here down.
  if (tieBreakerState) {
    if (tieBreakerState.status === "resolved" && tieBreakerState.winnerId) {
      return { phase: "winner", winnerId: tieBreakerState.winnerId }
    }
    if (tieBreakerState.status === "active" && tieBreakerState.endsAt) {
      return {
        phase: "tie-active",
        round: tieBreakerState.round,
        contestantIds: tieBreakerState.contestantIds,
        endsAt: tieBreakerState.endsAt,
        isFinalRound: tieBreakerState.isFinalRound,
      }
    }
    if (tieBreakerState.status === "fptp") {
      return {
        phase: "tie-fptp",
        round: tieBreakerState.round,
        contestantIds: tieBreakerState.contestantIds,
        endsAt: tieBreakerState.endsAt ?? null,
      }
    }
  }

  const totalVotes = (contestants ?? []).reduce((s, c) => s + (c.votes ?? 0), 0)
  if (totalVotes === 0) return { phase: "no-votes" }

  const topScore = Math.max(...contestants.map((c) => c.votes ?? 0))
  const top = contestants.filter((c) => (c.votes ?? 0) === topScore)
  if (top.length > 1) {
    return { phase: "tie-unresolved", contestantIds: top.map((c) => c.contestantId) }
  }
  return { phase: "winner", winnerId: top[0].contestantId }
}
