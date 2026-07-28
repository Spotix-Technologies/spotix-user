// Utility functions for voting operations
import { db } from "./firebase"
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  increment,
  serverTimestamp,
  query,
  where,
  limit,
  type FieldValue,
  Timestamp,
} from "firebase/firestore"

// Poll Types

export type PollType = "single" | "group"

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
  date:           FieldValue | string
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
}

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
  }
}

// Database helpers 

export async function checkUserVotingProfile(userId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "voting", userId))
    return snap.exists()
  } catch { return false }
}

export async function createUserVotingProfile(userId: string): Promise<void> {
  await setDoc(doc(db, "voting", userId), {
    createdAt:     serverTimestamp(),
    totalEarnings: 0,
    totalPolls:    0,
  })
}

export async function getAllUserPolls(
  userId: string,
): Promise<Array<{ id: string; data: VoteData }>> {
  try {
    const snap = await getDocs(collection(db, "voting", userId, "votes"))
    return snap.docs.map((d) => ({ id: d.id, data: serializePollData(d.data()) }))
  } catch { return [] }
}

export async function createVote(
  userId: string,
  voteData: Omit<VoteData, "pollCreation" | "pollCount" | "pollEntries">,
): Promise<string> {
  const userVotesRef = collection(db, "voting", userId, "votes")
  const voteRef      = doc(userVotesRef)
  const voteId       = voteRef.id

  await setDoc(voteRef, {
    ...voteData,
    contestants:  (voteData.contestants || []).map((c) => ({ ...c, votes: 0 })),
    pollCreation: serverTimestamp(),
    pollCount:    0,
    pollAmount:   0,
    pollEntries:  [],
  })

  const pollKey = pollNameToKey(voteData.pollName)
  await setDoc(doc(db, "pollKey", pollKey), {
    creatorId:       userId,
    voteId,
    pollImage:       voteData.pollImage,
    pollDescription: voteData.pollDescription,
    pollName:        voteData.pollName,
    createdAt:       serverTimestamp(),
  })

  await updateDoc(doc(db, "voting", userId), { totalPolls: increment(1) })
  return voteId
}

export async function getPollDetails(
  userId: string,
  voteId: string,
): Promise<VoteData | null> {
  try {
    const snap = await getDoc(doc(db, "voting", userId, "votes", voteId))
    return snap.exists() ? serializePollData(snap.data()) : null
  } catch { return null }
}

export async function getPollByFlatId(
  pollId: string,
): Promise<{ voteId: string; creatorId: string; pollData: VoteData } | null> {
  try {
    const snap = await getDoc(doc(db, "voting", pollId))
    if (!snap.exists()) return null
    const d = snap.data()
    if (!d.pollName) return null
    const creatorId = d.creatorId ?? d.organizerId ?? ""
    return { voteId: pollId, creatorId, pollData: serializePollData({ ...d, creatorId }) }
  } catch { return null }
}

export async function getPollByName(
  pollNameOrId: string,
): Promise<{ voteId: string; creatorId: string; pollData: VoteData } | null> {
  try {
    // 1. Try as direct flat pollId
    try {
      const directSnap = await getDoc(doc(db, "voting", pollNameOrId))
      if (directSnap.exists()) {
        const d = directSnap.data()
        if (d.pollName) {
          const creatorId = d.creatorId ?? d.organizerId ?? ""
          return { voteId: directSnap.id, creatorId, pollData: serializePollData({ ...d, creatorId }) }
        }
      }
    } catch { /* continue */ }

    // 2. Try flat query by pollName
    try {
      const flatSnap = await getDocs(
        query(collection(db, "voting"), where("pollName", "==", pollNameOrId), limit(1)),
      )
      if (!flatSnap.empty) {
        const flatDoc   = flatSnap.docs[0]
        const d         = flatDoc.data()
        const creatorId = d.creatorId ?? d.organizerId ?? ""
        return { voteId: flatDoc.id, creatorId, pollData: serializePollData({ ...d, creatorId }) }
      }
    } catch { /* continue */ }

    // 3. pollKey lookup
    const pollKey    = pollNameToKey(pollNameOrId)
    const pollKeyDoc = await getDoc(doc(db, "pollKey", pollKey))
    if (!pollKeyDoc.exists()) return null
    const { creatorId, voteId } = pollKeyDoc.data()
    const pollData = await getPollDetails(creatorId, voteId)
    if (!pollData) return null
    return { voteId, creatorId, pollData }
  } catch { return null }
}
