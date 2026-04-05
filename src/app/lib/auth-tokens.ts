/**
 * lib/auth-tokens.ts
 * Handles access token (JWT) generation and refresh token hashing.
 * Access tokens are short-lived (15 min), generated in-memory — never stored.
 * Refresh tokens are bcrypt-hashed before storage in Firestore.
 */

import * as jose from "jose";
import bcrypt from "bcryptjs";
import { randomUUID, randomBytes } from "crypto";

// ── Environment ────────────────────────────────────────────────────────────────
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
if (!ACCESS_TOKEN_SECRET) {
  throw new Error("ACCESS_TOKEN_SECRET env var is required");
}

const secret = new TextEncoder().encode(ACCESS_TOKEN_SECRET);

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_DAYS = 30;

/**
 * JWT audience values — one per portal.
 * Tokens issued for one portal are cryptographically rejected by the other,
 * even though both portals share the same ACCESS_TOKEN_SECRET.
 *
 *   "spotix-booker"  → booker dashboard  (app/api/auth/*)
 *   "spotix-user"    → user portal       (app/api/v1/auth/*)
 */
export type TokenAudience = "spotix-booker" | "spotix-user";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface AccessTokenPayload {
  uid: string;
  email: string;
  isBooker: boolean;
  deviceId: string;
}

export interface TokenPair {
  accessToken: string;
  /** Raw refresh token — send to client, hash before storing */
  rawRefreshToken: string;
  refreshTokenId: string;
  expiresAt: Date;
}

export interface DeviceMeta {
  platform?: string;
  model?: string;
  appVersion?: string;
}

// ── Access Tokens (JWT, in-memory only) ───────────────────────────────────────

/**
 * Sign an access token for the specified portal audience.
 * Always pass the audience explicitly — never rely on a default.
 */
export async function signAccessToken(
  payload: AccessTokenPayload,
  audience: TokenAudience
): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .setIssuer("spotix")
    .setAudience(audience)
    .sign(secret);
}

/**
 * Verify an access token, enforcing the expected audience.
 * A booker token passed to the user portal verifier (or vice-versa) will throw.
 */
export async function verifyAccessToken(
  token: string,
  audience: TokenAudience
): Promise<AccessTokenPayload> {
  const { payload } = await jose.jwtVerify(token, secret, {
    issuer: "spotix",
    audience,
  });

  return {
    uid: payload.uid as string,
    email: payload.email as string,
    isBooker: payload.isBooker as boolean,
    deviceId: payload.deviceId as string,
  };
}

// ── Refresh Tokens (bcrypt-hashed, stored in Firestore) ───────────────────────

/** Generate a cryptographically random refresh token */
export function generateRawRefreshToken(): string {
  return randomBytes(48).toString("hex"); // 96-char hex string
}

/** Hash a raw token with bcrypt (cost 12) before Firestore storage */
export async function hashRefreshToken(rawToken: string): Promise<string> {
  return bcrypt.hash(rawToken, 12);
}

/** Verify a raw token against a stored bcrypt hash */
export async function verifyRefreshTokenHash(
  rawToken: string,
  storedHash: string
): Promise<boolean> {
  return bcrypt.compare(rawToken, storedHash);
}

/** Generate a stable device ID if the client doesn't provide one */
export function newDeviceId(): string {
  return randomUUID();
}

/** Calculate refresh token expiry date (30 days from now) */
export function refreshTokenExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return d;
}