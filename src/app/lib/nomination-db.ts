/**
 * lib/nomination-db.ts
 *
 * Supabase query helpers for the open-nomination system (public side).
 * Every function here returns the SAME shape the old Firestore-backed
 * code returned, so the API routes and page.tsx that consume these
 * didn't need to change their response JSON — only where the data comes
 * from changed.
 *
 * See /supabase/schema.sql for table definitions and the
 * submit_nomination() RPC used by submitNomination() below.
 */

import { supabaseAdmin } from "./supabase"

export interface NominationPollRow {
  pollId: string
  pollName: string
  pollImage: string
  pollDescription: string
  categories: { categoryId: string; name: string }[]
  status: "active" | "closed"
}

export interface NomineeRow {
  nomineeId: string
  name: string
  count: number
}

/** Fetch one nomination poll's public metadata. Returns null if not found. */
export async function fetchNominationPoll(pollId: string): Promise<NominationPollRow | null> {
  const { data, error } = await supabaseAdmin
    .from("nomination_polls")
    .select("id, poll_name, poll_image, poll_description, categories, status")
    .eq("id", pollId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    pollId: data.id,
    pollName: data.poll_name ?? "",
    pollImage: data.poll_image ?? "",
    pollDescription: data.poll_description ?? "",
    categories: data.categories ?? [],
    status: (data.status as "active" | "closed") ?? "active",
  }
}

/**
 * Top-N nominees for a category, sorted by count desc — the public
 * leaderboard query. `limit` caps the result the same way
 * NOMINEE_LIST_LIMIT capped the old Firestore query (this cap no longer
 * exists to control billing — Postgres doesn't charge per row read —
 * but it's still the right size for a UI leaderboard, so it stays).
 */
export async function fetchTopNominees(
  pollId: string,
  categoryId: string,
  limit: number
): Promise<NomineeRow[]> {
  const { data, error } = await supabaseAdmin
    .from("nomination_nominees")
    .select("nominee_id, display_name, count")
    .eq("poll_id", pollId)
    .eq("category_id", categoryId)
    .order("count", { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []).map((row) => ({
    nomineeId: row.nominee_id,
    name: row.display_name ?? "",
    count: row.count ?? 0,
  }))
}

export type SubmitNominationResult =
  | { alreadyNominated: true }
  | { alreadyNominated: false; nomineeId: string; name: string; count: number }

/**
 * Calls the submit_nomination() Postgres function, which atomically:
 *   1. Checks the device+IP guards (one nomination per category per
 *      device AND per IP — same rule as before).
 *   2. Upserts the nominee row and increments its count.
 *
 * This one RPC call replaces the old Firestore transaction. Postgres
 * runs the whole function body in one implicit transaction, and the
 * guard table's unique constraint is the actual race-condition
 * backstop — see the comment on submit_nomination() in schema.sql for
 * why that matters under concurrent submissions.
 */
export async function submitNomination(params: {
  pollId: string
  categoryId: string
  deviceId: string
  ipHash: string
  normalizedName: string
  displayName: string
}): Promise<SubmitNominationResult> {
  const { data, error } = await supabaseAdmin.rpc("submit_nomination", {
    p_poll_id: params.pollId,
    p_category_id: params.categoryId,
    p_device_id: params.deviceId,
    p_ip_hash: params.ipHash,
    p_normalized_name: params.normalizedName,
    p_display_name: params.displayName,
  })

  if (error) throw error

  if (data.already_nominated) {
    return { alreadyNominated: true }
  }

  return {
    alreadyNominated: false,
    nomineeId: data.nominee_id,
    name: data.name,
    count: data.count,
  }
}
