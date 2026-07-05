/**
 * app/lib/auth-tokens.ts
 *
 * Shared JWT infrastructure for both the Booker and User portals.
 *
 * ── Audiences ─────────────────────────────────────────────────────────────────
 *   "spotix-booker"  — tokens issued at POST /api/v1/auth  (organiser portal)
 *   "spotix-user"    — tokens issued at POST /api/v1/auth  (user portal)
 *
 * A token signed for one audience is REJECTED by the other portal's middleware
 * even though both use the same ACCESS_TOKEN_SECRET.
 *
 * ── Required env vars ─────────────────────────────────────────────────────────
 *   ACCESS_TOKEN_SECRET   — long random string; shared between both portals
 *
 * ── Token lifetimes ───────────────────────────────────────────────────────────
 *   Access token  : 15 minutes  (ACCESS_TOKEN_TTL_SECONDS = 900)
 *   Refresh token : 30 days     (REFRESH_TOKEN_TTL_DAYS   = 30)
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { randomUUID } from "crypto";

export const ACCESS_TOKEN_TTL_SECONDS = 900;       // 15 min
export const REFRESH_TOKEN_TTL_DAYS   = 30;

// ── Cookie names (user portal) ──────────────────────────────────────────────
// Defined here (a plain lib module) rather than in route.ts, since Next.js
// route.ts files may only export HTTP method handlers and a small set of
// config options — any other export is a build-time error. Anything that
// needs these names (e.g. server components reading the session cookie)
// should import from here instead of from the route file.
export const COOKIE_ACCESS_TOKEN     = "spotix_u_at";
export const COOKIE_REFRESH_TOKEN    = "spotix_u_rt";
export const COOKIE_REFRESH_TOKEN_ID = "spotix_u_rtid";

export type PortalAudience = "spotix-booker" | "spotix-user";

export interface SpotixTokenPayload extends JWTPayload {
  uid:       string;
  email:     string;
  isBooker:  boolean;
  deviceId:  string;
}

export interface DeviceMeta {
  platform?:   string;
  model?:      string;
  appVersion?: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

/**
 * Sign a new access token.
 *
 * @param payload  - uid, email, isBooker, deviceId
 * @param audience - "spotix-booker" | "spotix-user"
 */
export async function signAccessToken(
  payload: Omit<SpotixTokenPayload, keyof JWTPayload>,
  audience: PortalAudience
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .setAudience(audience)
    .setIssuer("spotix")
    .sign(getSecret());
}

/**
 * Verify an access token and assert its audience.
 * Throws jose errors on expiry, bad signature, wrong audience, etc.
 */
export async function verifyAccessToken(
  token:    string,
  audience: PortalAudience
): Promise<SpotixTokenPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    audience,
    issuer: "spotix",
  });
  return payload as SpotixTokenPayload;
}

/** Generate a stable device UUID (server-side fallback). */
export function newDeviceId(): string {
  return randomUUID();
}
