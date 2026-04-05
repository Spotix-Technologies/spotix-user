/**
 * refresh-token-repo.ts
 * All Firestore operations for the `refreshTokens/{tokenId}` collection.
 *
 * Schema:
 *   refreshTokens/{tokenId}
 *     userId      : string
 *     tokenHash   : string   (bcrypt)
 *     deviceId    : string   (UUID from client)
 *     deviceMeta  : { platform, model, appVersion }
 *     createdAt   : Timestamp
 *     expiresAt   : Timestamp  (30 days)
 *     isRevoked   : boolean
 *     lastUsedAt  : Timestamp
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import {
  hashRefreshToken,
  generateRawRefreshToken,
  refreshTokenExpiresAt,
  type DeviceMeta,
} from "./auth-tokens";

const COLLECTION = "refreshTokens";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface StoredRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  deviceId: string;
  deviceMeta: DeviceMeta;
  createdAt: Date;
  expiresAt: Date;
  isRevoked: boolean;
  lastUsedAt: Date;
}

export interface IssueTokenResult {
  tokenId: string;
  rawToken: string;
  expiresAt: Date;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function docToStoredToken(id: string, data: FirebaseFirestore.DocumentData): StoredRefreshToken {
  return {
    id,
    userId: data.userId,
    tokenHash: data.tokenHash,
    deviceId: data.deviceId,
    deviceMeta: data.deviceMeta || {},
    createdAt: (data.createdAt as Timestamp).toDate(),
    expiresAt: (data.expiresAt as Timestamp).toDate(),
    isRevoked: data.isRevoked,
    lastUsedAt: (data.lastUsedAt as Timestamp).toDate(),
  };
}

// ── Core Operations ────────────────────────────────────────────────────────────

/**
 * Revoke all active (non-revoked, non-expired) refresh tokens
 * for a given userId + deviceId pair.
 * Called at login to prevent duplicate active sessions on the same device.
 */
export async function revokeActiveTokensForDevice(
  userId: string,
  deviceId: string
): Promise<void> {
  const now = Timestamp.now();
  const snap = await adminDb
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .where("deviceId", "==", deviceId)
    .where("isRevoked", "==", false)
    .where("expiresAt", ">", now)
    .get();

  if (snap.empty) return;

  const batch = adminDb.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { isRevoked: true });
  });
  await batch.commit();
}

/**
 * Issue a brand-new refresh token for a user/device.
 * Generates raw token → hashes it → stores in Firestore.
 * Returns the raw token (to send to client) + metadata.
 */
export async function issueRefreshToken(
  userId: string,
  deviceId: string,
  deviceMeta: DeviceMeta
): Promise<IssueTokenResult> {
  const rawToken = generateRawRefreshToken();
  const tokenHash = await hashRefreshToken(rawToken);
  const expiresAt = refreshTokenExpiresAt();
  const now = new Date();
  const tokenId = randomUUID();

  await adminDb
    .collection(COLLECTION)
    .doc(tokenId)
    .set({
      userId,
      tokenHash,
      deviceId,
      deviceMeta,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      isRevoked: false,
      lastUsedAt: Timestamp.fromDate(now),
    });

  return { tokenId, rawToken, expiresAt };
}

/**
 * Fetch a stored refresh token by its document ID.
 * Returns null if not found.
 */
export async function getRefreshTokenById(
  tokenId: string
): Promise<StoredRefreshToken | null> {
  const doc = await adminDb.collection(COLLECTION).doc(tokenId).get();
  if (!doc.exists) return null;
  return docToStoredToken(doc.id, doc.data()!);
}

/**
 * Rotate a refresh token:
 *   1. Revoke the old token document
 *   2. Issue a new token for the same userId + deviceId
 * Returns the new raw token and metadata.
 */
export async function rotateRefreshToken(
  oldTokenId: string,
  userId: string,
  deviceId: string,
  deviceMeta: DeviceMeta
): Promise<IssueTokenResult> {
  // Revoke old in a transaction alongside issuing new to prevent race conditions
  const newTokenId = randomUUID();
  const rawToken = generateRawRefreshToken();
  const tokenHash = await hashRefreshToken(rawToken);
  const expiresAt = refreshTokenExpiresAt();
  const now = new Date();

  await adminDb.runTransaction(async (tx) => {
    const oldRef = adminDb.collection(COLLECTION).doc(oldTokenId);
    const newRef = adminDb.collection(COLLECTION).doc(newTokenId);

    tx.update(oldRef, { isRevoked: true });
    tx.set(newRef, {
      userId,
      tokenHash,
      deviceId,
      deviceMeta,
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      isRevoked: false,
      lastUsedAt: Timestamp.fromDate(now),
    });
  });

  return { tokenId: newTokenId, rawToken, expiresAt };
}

/**
 * Mark a token as recently used (update lastUsedAt).
 */
export async function touchRefreshToken(tokenId: string): Promise<void> {
  await adminDb
    .collection(COLLECTION)
    .doc(tokenId)
    .update({ lastUsedAt: FieldValue.serverTimestamp() });
}

/**
 * Revoke a single token by ID (logout from one device).
 */
export async function revokeRefreshToken(tokenId: string): Promise<void> {
  await adminDb
    .collection(COLLECTION)
    .doc(tokenId)
    .update({ isRevoked: true });
}

/**
 * Revoke ALL tokens for a user (logout from all devices).
 */
export async function revokeAllTokensForUser(userId: string): Promise<void> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .where("isRevoked", "==", false)
    .get();

  if (snap.empty) return;

  const batch = adminDb.batch();
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { isRevoked: true });
  });
  await batch.commit();
}