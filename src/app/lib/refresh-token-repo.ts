/**
 * app/lib/refresh-token-repo.ts
 *
 * Database helpers for the refreshTokens/{tokenId} collection.
 *
 * Schema (one document per active session):
 * ┌──────────────────┬───────────────────────────────────────────────────────┐
 * │ Field            │ Description                                           │
 * ├──────────────────┼───────────────────────────────────────────────────────┤
 * │ userId           │ Firebase UID                                          │
 * │ deviceId         │ Stable UUID from the client                           │
 * │ tokenHash        │ bcrypt hash of the raw token (cost factor 10)         │
 * │ deviceMeta       │ { platform, model, appVersion }                       │
 * │ createdAt        │ ISO string                                            │
 * │ expiresAt        │ Database Timestamp (30 days from creation)           │
 * │ revoked          │ boolean — false until logout / rotation               │
 * │ revokedAt        │ ISO string | null                                     │
 * └──────────────────┴───────────────────────────────────────────────────────┘
 *
 * Security properties:
 *   - Raw token is NEVER stored; only its bcrypt hash.
 *   - On every successful refresh the old token is revoked and a new one issued
 *     (rolling window rotation).
 *   - On login, all existing active tokens for the same userId+deviceId are
 *     revoked first (single-session-per-device model).
 */

import { adminDb } from "@/app/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { REFRESH_TOKEN_TTL_DAYS, type DeviceMeta } from "./auth-tokens";

const COLLECTION = "refreshTokens";
const BCRYPT_ROUNDS = 10;

// Types

export interface IssuedRefreshToken {
  tokenId:   string;    // Database document ID that's stored in spotix_u_rtid cookie
  rawToken:  string;    // Sent in spotix_u_rt cookie (never persisted)
  expiresAt: Date;
}

// Issue 

/**
 * Create a new refresh token document.
 * Returns the raw token (to be set as httpOnly cookie) and its Databse ID.
 */
export async function issueRefreshToken(
  userId:     string,
  deviceId:   string,
  deviceMeta: DeviceMeta = { platform: "unknown", model: "unknown", appVersion: "1.0.0" }
): Promise<IssuedRefreshToken> {
  const rawToken  = randomBytes(48).toString("hex");   // 96-char hex string
  const tokenHash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const docRef = await adminDb.collection(COLLECTION).add({
    userId,
    deviceId,
    tokenHash,
    deviceMeta,
    createdAt:  new Date().toISOString(),
    expiresAt:  Timestamp.fromDate(expiresAt),
    revoked:    false,
    revokedAt:  null,
  });

  return { tokenId: docRef.id, rawToken, expiresAt };
}

// Verify 

/**
 * Verify a refresh token by:
 *   1. Fetching the Firestore document by tokenId.
 *   2. Checking it's not revoked and not expired.
 *   3. bcrypt-comparing the raw token against the stored hash.
 *
 * Returns the document data on success, throws on any failure.
 */
export async function verifyRefreshToken(
  tokenId:  string,
  rawToken: string
): Promise<{ userId: string; deviceId: string; deviceMeta: DeviceMeta }> {
  const docRef  = adminDb.collection(COLLECTION).doc(tokenId);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    throw new Error("Refresh token not found");
  }

  const data = docSnap.data()!;

  if (data.revoked) {
    throw new Error("Refresh token has been revoked");
  }

  const expiresAt: Date =
    data.expiresAt instanceof Timestamp
      ? data.expiresAt.toDate()
      : new Date(data.expiresAt);

  if (expiresAt < new Date()) {
    throw new Error("Refresh token has expired");
  }

  const valid = await bcrypt.compare(rawToken, data.tokenHash);
  if (!valid) {
    throw new Error("Refresh token is invalid");
  }

  return {
    userId:     data.userId,
    deviceId:   data.deviceId,
    deviceMeta: data.deviceMeta || { platform: "unknown", model: "unknown", appVersion: "1.0.0" },
  };
}

// Revoke 

/** Mark a single token as revoked (used during rolling refresh). */
export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await adminDb.collection(COLLECTION).doc(tokenId).update({
    revoked:   true,
    revokedAt: new Date().toISOString(),
  });
}

/**
 * Revoke ALL active tokens for a given userId + deviceId combo.
 * Called at the start of login to enforce single-session-per-device.
 */
export async function revokeActiveTokensForDevice(
  userId:   string,
  deviceId: string
): Promise<void> {
  const now = Timestamp.now();
  const snap = await adminDb
    .collection(COLLECTION)
    .where("userId",   "==", userId)
    .where("deviceId", "==", deviceId)
    .where("revoked",  "==", false)
    .where("expiresAt", ">", now)
    .get();

  if (snap.empty) return;

  const batch = adminDb.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      revoked:   true,
      revokedAt: new Date().toISOString(),
    });
  });
  await batch.commit();
}

/**
 * Revoke ALL active tokens for a userId (all devices).
 * Used by POST /api/v1/auth/logout?allDevices=true.
 */
export async function revokeAllTokensForUser(userId: string): Promise<void> {
  const now  = Timestamp.now();
  const snap = await adminDb
    .collection(COLLECTION)
    .where("userId",    "==", userId)
    .where("revoked",   "==", false)
    .where("expiresAt", ">", now)
    .get();

  if (snap.empty) return;

  const batch = adminDb.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, {
      revoked:   true,
      revokedAt: new Date().toISOString(),
    });
  });
  await batch.commit();
}
