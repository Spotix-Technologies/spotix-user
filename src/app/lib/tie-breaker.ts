// src/app/lib/tie-breaker.ts
//
// Pure state-machine for resolving poll ties once a poll (or a leaf
// category, for group polls) ends with 2+ contestants sharing the top
// vote count.
//
// MIRRORS spotix-backend/v1/lib/tie-breaker.js — keep both in sync. They
// can't share a module (separate deployments/codebases), so the logic is
// duplicated deliberately, the same way the royalty/fee math is mirrored
// between booker/app/lib/poll-config.ts and spotix-backend/v1/voting.js.
//
// No Firestore here — this file is dependency-free (like voting-helpers.ts)
// and safe to import as a value from server code, API routes, or client
// components alike. Callers own the actual reads/writes.
//
// ── Config (read from voting/{pollId}, set via TieBreakerPanel in booker) ──
//   enabledTieBreaker   boolean      — feature on/off for this poll
//   tieBreakerDuration  number|null  — hours each round stays open (required if enabled)
//   tieBreakerRounds    number|null  — cap on rounds; null = 1 round then FPTP
//
// ── Runtime state (voting/{pollId}.tieBreakers, keyed by scope) ────────────
//   scopeKey = "single" for single-type polls, or the leaf category's
//   categoryId for group polls.
//
// See spotix-backend/v1/lib/voting/tie-breaker.js's header comment for the
// full lifecycle write-up (round opening → expiry → next round/FPTP →
// resolution, including the FPTP renewal window) — identical here.

import type { ContestantData, CategoryData, VoteData } from "./voting-utils"

export const DEFAULT_TIE_BREAKER_ROUNDS = 1
export const DEFAULT_TIE_BREAKER_DURATION_HOURS = 24

export interface TieBreakerState {
  scopeKey: string
  status: "active" | "fptp" | "resolved"
  round: number
  contestantIds: string[]
  roundStartVotes: Record<string, number>
  firstVoterContestantId: string | null
  startedAt: string
  endsAt: string | null
  isFinalRound: boolean
  winnerId: string | null
  resolvedMethod: "tiebreaker-round" | "fptp" | null
  resolvedAt: string | null
  history: Array<{
    round: number
    contestantIds: string[]
    roundVotes: Record<string, number>
    endedAt: string
  }>
}

export type TieBreakerMap = Record<string, TieBreakerState>

interface TieBreakerConfig {
  enabled: boolean
  durationHours: number | null
  rounds: number | null
}

interface Scope {
  scopeKey: string
  contestants: ContestantData[]
}

/** Poll's scheduled end instant, from its pollEndDate/pollEndTime fields. */
export function getPollEndTime(pollData: Pick<VoteData, "pollEndDate" | "pollEndTime">): Date {
  return new Date(`${pollData.pollEndDate}T${pollData.pollEndTime}`)
}

/**
 * Enumerates the tie-breaker "scopes" on a poll: one for a single-type
 * poll (the whole contestant list), or one per LEAF category for a
 * group poll (categories with contestants, not subcategories — a
 * folder category has nothing of its own to tie-break).
 */
export function getTieBreakerScopes(pollData: Pick<VoteData, "pollType" | "contestants" | "categories">): Scope[] {
  if (pollData.pollType === "group") {
    const scopes: Scope[] = []
    const walk = (cats: CategoryData[]) => {
      for (const cat of cats ?? []) {
        if (cat.subcategories && cat.subcategories.length > 0) {
          walk(cat.subcategories)
        } else {
          scopes.push({ scopeKey: cat.categoryId, contestants: cat.contestants ?? [] })
        }
      }
    }
    walk(pollData.categories ?? [])
    return scopes
  }
  return [{ scopeKey: "single", contestants: pollData.contestants ?? [] }]
}

/** Top score, the contestant(s) sharing it, and the scope's total votes. */
export function computeStandings(contestants: ContestantData[]) {
  const list = contestants ?? []
  const totalVotes = list.reduce((s, c) => s + (c.votes ?? 0), 0)
  if (list.length === 0) return { topScore: 0, top: [] as ContestantData[], totalVotes: 0 }
  const topScore = Math.max(...list.map((c) => c.votes ?? 0))
  const top = list.filter((c) => (c.votes ?? 0) === topScore)
  return { topScore, top, totalVotes }
}

function snapshotVotes(contestants: ContestantData[], ids: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const id of ids) map[id] = contestants.find((c) => c.contestantId === id)?.votes ?? 0
  return map
}

function openRound(args: {
  scopeKey: string
  contestantIds: string[]
  contestants: ContestantData[]
  round: number
  now: Date
  durationMs: number
  maxRounds: number
  history: TieBreakerState["history"]
}): TieBreakerState {
  const { scopeKey, contestantIds, contestants, round, now, durationMs, maxRounds, history } = args
  return {
    scopeKey,
    status: "active",
    round,
    contestantIds,
    roundStartVotes: snapshotVotes(contestants, contestantIds),
    firstVoterContestantId: null,
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + durationMs).toISOString(),
    isFinalRound: round >= maxRounds,
    winnerId: null,
    resolvedMethod: null,
    resolvedAt: null,
    history,
  }
}

function openFptp(args: {
  scopeKey: string
  contestantIds: string[]
  contestants: ContestantData[]
  round: number
  now: Date
  durationMs: number
  history: TieBreakerState["history"]
}): TieBreakerState {
  const { scopeKey, contestantIds, contestants, round, now, durationMs, history } = args
  return {
    scopeKey,
    status: "fptp",
    round,
    contestantIds,
    roundStartVotes: snapshotVotes(contestants, contestantIds),
    firstVoterContestantId: null,
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + durationMs).toISOString(),
    isFinalRound: true,
    winnerId: null,
    resolvedMethod: null,
    resolvedAt: null,
    history,
  }
}

/**
 * Advance a single scope's tie-breaker state by however many rounds have
 * silently expired since it was last ticked. Returns the SAME reference
 * if nothing changed, so callers can cheaply detect "did anything happen".
 */
function tickScope(
  scope: Scope,
  existingState: TieBreakerState | null,
  pollEndTime: Date,
  now: Date,
  config: TieBreakerConfig,
): TieBreakerState | null {
  const { scopeKey, contestants } = scope
  const pollEnded = now.getTime() >= pollEndTime.getTime()
  if (!pollEnded) return existingState ?? null
  if (!config.enabled) return existingState ?? null
  if (existingState?.status === "resolved") return existingState

  const { top, totalVotes } = computeStandings(contestants)

  // Nothing to break a tie over yet.
  if (!existingState && totalVotes === 0) return null
  if (!existingState && top.length <= 1) return null

  const durationMs = (config.durationHours ?? DEFAULT_TIE_BREAKER_DURATION_HOURS) * 60 * 60 * 1000
  const maxRounds  = config.rounds ?? DEFAULT_TIE_BREAKER_ROUNDS

  if (!existingState) {
    return openRound({
      scopeKey,
      contestantIds: top.map((c) => c.contestantId),
      contestants,
      round: 1,
      now,
      durationMs,
      maxRounds,
      history: [],
    })
  }

  // FPTP window — same length as a timed round. Still waiting inside the
  // window? Nothing to do; a vote resolves it instantly elsewhere
  // (recordTieBreakerVote), not through this tick.
  if (existingState.status === "fptp") {
    const fptpEndsAt = existingState.endsAt ? new Date(existingState.endsAt) : null
    if (!fptpEndsAt || now.getTime() < fptpEndsAt.getTime()) return existingState

    // Window lapsed with nobody voting — renew a fresh FPTP window for the
    // same tied contestants rather than resolving anything.
    const roundVotes: Record<string, number> = {}
    for (const cid of existingState.contestantIds) {
      const current = contestants.find((c) => c.contestantId === cid)?.votes ?? 0
      const started = existingState.roundStartVotes?.[cid] ?? 0
      roundVotes[cid] = current - started
    }
    const history: TieBreakerState["history"] = [
      ...(existingState.history ?? []),
      { round: existingState.round, contestantIds: existingState.contestantIds, roundVotes, endedAt: now.toISOString() },
    ].slice(-20)

    return openFptp({
      scopeKey,
      contestantIds: existingState.contestantIds,
      contestants,
      round: existingState.round + 1,
      now,
      durationMs,
      history,
    })
  }

  const endsAt = existingState.endsAt ? new Date(existingState.endsAt) : null
  if (!endsAt || now.getTime() < endsAt.getTime()) return existingState

  // Round window has expired — tally THIS round's votes only.
  const roundVotes: Record<string, number> = {}
  let roundTop = -Infinity
  for (const cid of existingState.contestantIds) {
    const current = contestants.find((c) => c.contestantId === cid)?.votes ?? 0
    const started = existingState.roundStartVotes?.[cid] ?? 0
    const delta = current - started
    roundVotes[cid] = delta
    if (delta > roundTop) roundTop = delta
  }
  const stillTied = existingState.contestantIds.filter((cid) => roundVotes[cid] === roundTop)

  const history: TieBreakerState["history"] = [
    ...(existingState.history ?? []),
    { round: existingState.round, contestantIds: existingState.contestantIds, roundVotes, endedAt: now.toISOString() },
  ].slice(-20)

  if (stillTied.length <= 1) {
    const winnerId = stillTied[0] ?? existingState.contestantIds[0]
    return {
      ...existingState,
      status: "resolved",
      winnerId,
      resolvedMethod: "tiebreaker-round",
      resolvedAt: now.toISOString(),
      history,
    }
  }

  if (existingState.round < maxRounds) {
    return openRound({
      scopeKey,
      contestantIds: stillTied,
      contestants,
      round: existingState.round + 1,
      now,
      durationMs,
      maxRounds,
      history,
    })
  }

  // Rounds exhausted, still tied — first-past-the-post decides it.
  return openFptp({
    scopeKey,
    contestantIds: stillTied,
    contestants,
    round: existingState.round + 1,
    now,
    durationMs,
    history,
  })
}

/**
 * Advances every scope on a poll to its current state as of `now`.
 * Returns the full tieBreakers map (unchanged scopes included) plus a
 * `changed` flag so the caller only writes to Firestore when necessary.
 */
export function tickTieBreakers(
  pollData: Pick<VoteData, "pollType" | "contestants" | "categories" | "pollEndDate" | "pollEndTime" | "enabledTieBreaker" | "tieBreakerDuration" | "tieBreakerRounds" | "tieBreakers">,
  now: Date = new Date(),
): { tieBreakers: TieBreakerMap; changed: boolean } {
  const config: TieBreakerConfig = {
    enabled: pollData.enabledTieBreaker ?? false,
    durationHours: pollData.tieBreakerDuration ?? null,
    rounds: pollData.tieBreakerRounds ?? null,
  }
  const existing = pollData.tieBreakers ?? {}
  if (!config.enabled) return { tieBreakers: existing, changed: false }

  const pollEndTime = getPollEndTime(pollData)
  const scopes = getTieBreakerScopes(pollData)

  const updated: TieBreakerMap = { ...existing }
  let changed = false

  for (const scope of scopes) {
    const before = existing[scope.scopeKey] ?? null
    const after  = tickScope(scope, before, pollEndTime, now, config)
    if (after !== before) {
      changed = true
      if (after) updated[scope.scopeKey] = after
    }
  }

  return { tieBreakers: updated, changed }
}

export type ScopeEligibility =
  | { mode: "open" }
  | { mode: "tiebreaker"; contestantIds: string[]; round: number; status: "active" | "fptp" }
  | { mode: "closed" }

/**
 * Whether a vote for a contestant in `scopeKey` should be accepted right
 * now — the real gate lives in the payref route (before money changes
 * hands); the webhook re-checks defensively.
 */
export function getScopeEligibility(
  pollData: Pick<VoteData, "pollEndDate" | "pollEndTime" | "tieBreakers">,
  scopeKey: string,
  now: Date = new Date(),
): ScopeEligibility {
  const pollEndTime = getPollEndTime(pollData)
  if (now.getTime() < pollEndTime.getTime()) return { mode: "open" }

  const tb = pollData.tieBreakers?.[scopeKey] ?? null
  if (tb && (tb.status === "active" || tb.status === "fptp")) {
    return { mode: "tiebreaker", contestantIds: tb.contestantIds, round: tb.round, status: tb.status }
  }
  return { mode: "closed" }
}
