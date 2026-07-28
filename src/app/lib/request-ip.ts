/**
 * lib/request-ip.ts
 * Extracts the caller's IP the same way api/v1/discover/route.ts and
 * api/v1/geo/state/route.ts already do (Vercel sets x-forwarded-for).
 * We only ever store a salted hash of the IP, never the raw address.
 */

import { NextRequest } from "next/server"
import { createHash } from "crypto"

export function getRequestIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  )
}

/** Salted so a raw IP can't be recovered from Database even if it leaked. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "spotix-nomination-salt"
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32)
}
