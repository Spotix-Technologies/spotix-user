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
