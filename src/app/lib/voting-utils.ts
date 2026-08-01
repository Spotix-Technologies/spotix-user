// Utility functions for voting operations
//
// SERVER-ONLY — this file imports firebase-admin, which requires Node
// builtins (fs, child_process) that don't exist in the browser. NEVER
// import a VALUE from this file into a "use client" component — it will
// break the build ("Module not found: Can't resolve 'child_process'")
// because bundlers pull in this file's entire import graph the moment
// any value (not just a type) is imported from it, even from a client
// component that only wanted one small function.
//
// The pure, dependency-free helpers (getPollStatus, generateContestantId,
// generateCategoryId, pollNameToKey, plus the PollType/PollStatus types)
// live in ./voting-helpers instead — that file has zero server
// dependencies and is safe to import as values from client components.
// This file re-exports them so existing server-side and TYPE-only
// imports (`import type {...} from "./voting-utils"` — always erased at
// compile time, never a bundling risk regardless of what this file
// imports) don't need to change.
//
// Was previously built on the CLIENT Firebase SDK (`firebase/firestore`)
// even though every function here runs server-side (either in a Server
// Component or another server-side helper) — the rest of Spotix uses the
// Admin SDK server-side and the client SDK only for Auth. Migrated to
// `adminDb` to match that, and to unlock Redis caching on the read path
// `getPollByName()` — which is the ACTUAL function the public voting-poll
// page (`spotix-user/src/app/polls/[poll-name]/page.tsx`) calls on every
// single page view, with up to 3 sequential Firestore reads in the worst
// case (direct doc get, a `where("pollName","==",...)` query, then a
// pollKey lookup + nested doc get) and zero caching. That's the page
// every voter lands on before paying — the actual highest-traffic,
// highest-stakes read in the app.
//
// Caching note: pollAmount/pollCount/pollEntries change on real
// successful payments. spotix-backend's voting.js calls
// invalidatePollCache() (see v1/redis.js there) right after crediting a
// vote, so this is normally fresh within moments — the 15s TTL below is
// just the worst-case fallback if that call ever fails or is skipped.
import { adminDb } from "./firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { cacheGet, cacheSet } from "./redis"
import {
  type PollType,
  type PollStatus,
  getPollStatus,
  generateContestantId,
  generateCategoryId,
  pollNameToKey,
} from "./voting-helpers"

// Re-exported so anything already importing these from voting-utils.ts
// (server code, or TYPE-only imports from client components — those are
// erased at compile time and never pull in this file's runtime code
// either way) keeps working unchanged. Anything importing these as
// VALUES from a client component must import from ./voting-helpers
// directly instead — see that file's header comment for why.
export type { PollType, PollStatus }
export { getPollStatus, generateContestantId, generateCategoryId, pollNameToKey }

// Poll Types

export interface ContestantData {
  contestantId: string
  name: string
  image: string
  votes?: number
}

/**
 * A category in a group poll.
 * Categories can be nested: each category may contain subcategories
 * (which themselves can have subcategories) AND/OR direct contestants.
 * A category that has subcategories acts as a "folder"; one with only
 * contestants is a "leaf".
 */
export interface CategoryData {
  categoryId:     string
  name:           string
  pollPrice:      number              // per-category price
  contestants:    ContestantData[]    // leaf contestants (empty if subcategories exist)
  subcategories?: CategoryData[]      // nested sub-categories (optional)
}

export interface VoteEntry {
  uid:            string
  voteCount:      number
  price:          number
  contestantId:   string
  contestantName: string
  categoryId?:    string              // leaf category that received the vote
  date:           string
  reference:      string
  isGuest:        boolean
}

export interface VoteData {
  pollName:        string
  pollImage:       string
  pollDescription: string
  pollStartDate:   string
  pollStartTime:   string
  pollEndDate:     string
  pollEndTime:     string
  pollAmount:      number
  pollPrice:       number             // single poll price; 0 for group polls
  pollCount:       number
  pollCreation:    string
  pollEntries:     VoteEntry[]
  contestants:     ContestantData[]   // single poll contestants
  categories?:     CategoryData[]     // group poll Tier-1 categories (nested)
  creatorId:       string
  pollType?:       PollType           // "single" | "group" — defaults to "single"
  buyerBearsBurden?: boolean          // true = buyer pays royalty; false = seller absorbs
  statsVisible?:   boolean            // organiser controls vote-count visibility
  suspended?:      boolean            // admin can suspend a poll
  flagged?:        boolean            // admin flag disables payouts
  /**
   * When true, this poll's contestants/categories aren't finalised yet —
   * the organiser created it (name + image already set) but is waiting
   * on an open-nomination poll to close before adding real contestants.
   * The public page shows "Voting Poll coming soon" instead of an empty
   * contestant list. Set at creation, cleared once real contestants are
   * added. See spotix-booker/app/api/polls/create/route.ts.
   */
  contestantsTBD?: boolean
}

// Serialisation helpers

function tsToIso(v: unknown): string {
  if (!v) return new Date().toISOString()
  if (v instanceof Timestamp) return v.toDate().toISOString()
  if (typeof v === "object" && v !== null && "seconds" in (v as any))
    return new Date((v as any).seconds * 1000).toISOString()
  if (typeof v === "string" || typeof v === "number") return new Date(v).toISOString()
  return new Date().toISOString()
}

/** Recursively serialize a category tree, ensuring votes default to 0. */
function serializeCategories(cats: any[]): CategoryData[] {
  return (cats || []).map((cat: any) => ({
    ...cat,
    contestants: (cat.contestants || []).map((c: any) => ({ ...c, votes: c.votes ?? 0 })),
    subcategories: cat.subcategories ? serializeCategories(cat.subcategories) : undefined,
  }))
}

function serializePollData(data: any): VoteData {
  return {
    ...data,
    pollCreation: tsToIso(data.pollCreation ?? data.createdAt),
    createdAt:    tsToIso(data.createdAt),
    updatedAt:
      typeof data.updatedAt === "string" ? data.updatedAt : tsToIso(data.updatedAt),
    pollEntries: (data.pollEntries || []).map((entry: any) => ({
      ...entry,
      date:
        entry.date instanceof Timestamp
          ? entry.date.toDate().toISOString()
          : typeof entry.date === "object" && entry.date !== null && "seconds" in entry.date
            ? new Date(entry.date.seconds * 1000).toISOString()
            : entry.date,
    })),
    contestants: (data.contestants || []).map((c: any) => ({ ...c, votes: c.votes ?? 0 })),
    categories:
      data.categories ? serializeCategories(data.categories) : undefined,
    pollType:         data.pollType          ?? "single",
    buyerBearsBurden: data.buyerBearsBurden  ?? true,
    statsVisible:     data.statsVisible      ?? true,
    suspended:        data.suspended         ?? false,
    flagged:          data.flagged           ?? false,
    contestantsTBD:   data.contestantsTBD    ?? false,
  }
}

// Database helpers

export async function checkUserVotingProfile(userId: string): Promise<boolean> {
  try {
    const snap = await adminDb.collection("voting").doc(userId).get()
    return snap.exists
  } catch { return false }
}

export async function createUserVotingProfile(userId: string): Promise<void> {
  await adminDb.collection("voting").doc(userId).set({
    createdAt:     FieldValue.serverTimestamp(),
    totalEarnings: 0,
    totalPolls:    0,
  })
}

export async function getAllUserPolls(
  userId: string,
): Promise<Array<{ id: string; data: VoteData }>> {
  try {
    const snap = await adminDb.collection("voting").doc(userId).collection("votes").get()
    return snap.docs.map((d) => ({ id: d.id, data: serializePollData(d.data()) }))
  } catch { return [] }
}

export async function createVote(
  userId: string,
  voteData: Omit<VoteData, "pollCreation" | "pollCount" | "pollEntries">,
): Promise<string> {
  const userVotesRef = adminDb.collection("voting").doc(userId).collection("votes")
  const voteRef      = userVotesRef.doc()
  const voteId       = voteRef.id

  await voteRef.set({
    ...voteData,
    contestants:  (voteData.contestants || []).map((c) => ({ ...c, votes: 0 })),
    pollCreation: FieldValue.serverTimestamp(),
    pollCount:    0,
    pollAmount:   0,
    pollEntries:  [],
  })

  const pollKey = pollNameToKey(voteData.pollName)
  await adminDb.collection("pollKey").doc(pollKey).set({
    creatorId:       userId,
    voteId,
    pollImage:       voteData.pollImage,
    pollDescription: voteData.pollDescription,
    pollName:        voteData.pollName,
    createdAt:       FieldValue.serverTimestamp(),
  })

  await adminDb.collection("voting").doc(userId).update({ totalPolls: FieldValue.increment(1) })
  return voteId
}

export async function getPollDetails(
  userId: string,
  voteId: string,
): Promise<VoteData | null> {
  try {
    const snap = await adminDb.collection("voting").doc(userId).collection("votes").doc(voteId).get()
    return snap.exists ? serializePollData(snap.data()) : null
  } catch { return null }
}

type ResolvedPoll = { voteId: string; creatorId: string; pollData: VoteData }

/**
 * Shared cache namespace for the two public lookup functions below.
 * Keyed by whatever string the caller passed in (pollId OR pollName) —
 * that's the actual repeat-traffic pattern (the same shared link/URL
 * gets hit over and over), so caching at this level means a repeat view
 * of the same URL costs zero Firestore reads within the TTL window,
 * regardless of which of the 3 lookup strategies resolved it originally.
 *
 * Short TTL (see file header) because there's no write-side invalidation
 * hook into this from the vote-crediting webhook.
 */
const POLL_LOOKUP_CACHE_TTL_SECONDS = 15
function pollLookupCacheKey(input: string): string {
  return `voting-poll-lookup:${input}`
}

export async function getPollByFlatId(
  pollId: string,
): Promise<ResolvedPoll | null> {
  const cacheKey = pollLookupCacheKey(pollId)
  const cached = await cacheGet<ResolvedPoll>(cacheKey)
  if (cached) return cached

  try {
    const snap = await adminDb.collection("voting").doc(pollId).get()
    if (!snap.exists) return null
    const d = snap.data()!
    if (!d.pollName) return null
    const creatorId = d.creatorId ?? d.organizerId ?? ""
    const result: ResolvedPoll = { voteId: pollId, creatorId, pollData: serializePollData({ ...d, creatorId }) }

    await cacheSet(cacheKey, result, POLL_LOOKUP_CACHE_TTL_SECONDS)
    return result
  } catch { return null }
}

export async function getPollByName(
  pollNameOrId: string,
): Promise<ResolvedPoll | null> {
  const cacheKey = pollLookupCacheKey(pollNameOrId)
  const cached = await cacheGet<ResolvedPoll>(cacheKey)
  if (cached) return cached

  try {
    // 1. Try as direct flat pollId
    try {
      const directSnap = await adminDb.collection("voting").doc(pollNameOrId).get()
      if (directSnap.exists) {
        const d = directSnap.data()!
        if (d.pollName) {
          const creatorId = d.creatorId ?? d.organizerId ?? ""
          const result: ResolvedPoll = { voteId: directSnap.id, creatorId, pollData: serializePollData({ ...d, creatorId }) }
          await cacheSet(cacheKey, result, POLL_LOOKUP_CACHE_TTL_SECONDS)
          return result
        }
      }
    } catch { /* continue */ }

    // 2. Try flat query by pollName
    try {
      const flatSnap = await adminDb
        .collection("voting")
        .where("pollName", "==", pollNameOrId)
        .limit(1)
        .get()
      if (!flatSnap.empty) {
        const flatDoc   = flatSnap.docs[0]
        const d         = flatDoc.data()
        const creatorId = d.creatorId ?? d.organizerId ?? ""
        const result: ResolvedPoll = { voteId: flatDoc.id, creatorId, pollData: serializePollData({ ...d, creatorId }) }
        await cacheSet(cacheKey, result, POLL_LOOKUP_CACHE_TTL_SECONDS)
        return result
      }
    } catch { /* continue */ }

    // 3. pollKey lookup (legacy nested voting/{userId}/votes/{voteId} polls)
    const pollKey    = pollNameToKey(pollNameOrId)
    const pollKeyDoc = await adminDb.collection("pollKey").doc(pollKey).get()
    if (!pollKeyDoc.exists) return null
    const { creatorId, voteId } = pollKeyDoc.data()!
    const pollData = await getPollDetails(creatorId, voteId)
    if (!pollData) return null

    const result: ResolvedPoll = { voteId, creatorId, pollData }
    await cacheSet(cacheKey, result, POLL_LOOKUP_CACHE_TTL_SECONDS)
    return result
  } catch { return null }
}
