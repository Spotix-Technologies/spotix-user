/**
 * lib/supabase.ts
 *
 * Supabase Postgres client for the open-nomination system. This is the
 * ONLY part of Spotix that lives in Supabase — events, users, tickets,
 * and voting polls all stay in Firestore. See /supabase/schema.sql for
 * the tables this talks to and /README-SUPABASE-NOMINATIONS.md for why
 * this piece moved (Firestore per-document read billing + an open,
 * public, potentially-viral nomination flow don't mix).
 *
 * Uses the service-role key because every caller here is a trusted
 * server route — never import this into a "use client" component, the
 * key would leak to the browser. Row Level Security is enabled on every
 * nomination_* table with no policies defined, so the anon/publishable
 * key gets hard-denied by design; only the service role can read/write.
 *
 * Env vars required (see README for where to find these in your
 * Supabase project settings):
 *   NEXT_PUBLIC_SUPABASE_URL   (Project Settings → API → Project URL)
 *   SUPABASE_SERVICE_ROLE_KEY  (Project Settings → API → service_role key)
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) env var is required")
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY env var is required")
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
