/**
 * app/api/v1/auth/refresh/route.ts
 *
 * POST /api/v1/auth/refresh — Silent token rotation
 *
 * Reads the httpOnly spotix_u_rt + spotix_u_rtid cookies (scoped to this path).
 * Verifies the refresh token against Firestore, revokes the old one, issues a
 * fresh access token + new refresh token pair (rolling window rotation).
 *
 * Called automatically by the auth client when:
 *   - The in-memory access token is within 30 seconds of expiry (proactive)
 *   - A protected API call returns 401 (reactive)
 *   - getSessionUser() finds no authenticated session (on mount/focus)
 *
 * The singleton refresh lock in auth-client-user.ts ensures only one HTTP
 * request is ever in-flight at a time, even when multiple components mount
 * simultaneously and all see an expired token.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/lib/firebase-admin";
import {
  signAccessToken,
  ACCESS_TOKEN_TTL_SECONDS,
  type DeviceMeta,
} from "@/app/lib/auth-tokens";
import {
  verifyRefreshToken,
  revokeRefreshToken,
  issueRefreshToken,
} from "@/app/lib/refresh-token-repo";
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_REFRESH_TOKEN_ID,
  setAuthCookies,
} from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IS_PROD  = process.env.NODE_ENV === "production";
const AUDIENCE = "spotix-user" as const;
const DEV_TAG  = "API developed and maintained by Spotix Technologies";

function err(error: string, message: string, status: number) {
  return NextResponse.json({ error, message, developer: DEV_TAG }, { status });
}

// ── POST /api/v1/auth/refresh ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── 1. Read refresh token cookies ─────────────────────────────────────────
    const rawToken  = request.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
    const tokenId   = request.cookies.get(COOKIE_REFRESH_TOKEN_ID)?.value;

    if (!rawToken || !tokenId) {
      return err("Unauthorized", "No refresh token provided", 401);
    }

    // ── 2. Verify against Firestore (bcrypt compare + expiry + revocation) ────
    let userId:     string;
    let deviceId:   string;
    let deviceMeta: DeviceMeta;

    try {
      ({ userId, deviceId, deviceMeta } = await verifyRefreshToken(tokenId, rawToken));
    } catch (verifyErr: any) {
      // Clear cookies on any verification failure
      const response = err("Unauthorized", verifyErr.message || "Invalid refresh token", 401);
      clearRefreshCookies(response);
      return response;
    }

    // ── 3. Fetch latest user data ─────────────────────────────────────────────
    let isBooker = false;
    let email    = "";

    try {
      const userDoc = await adminDb.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return err("Not Found", "User no longer exists", 404);
      }
      const userData = userDoc.data()!;
      isBooker = userData.isBooker || false;
      email    = userData.email    || "";
    } catch (firestoreErr: any) {
      console.error("Firestore fetch during refresh:", firestoreErr);
      return err("Database Error", "Unable to retrieve user data", 500);
    }

    // ── 4. Revoke old refresh token (rolling rotation) ────────────────────────
    try {
      await revokeRefreshToken(tokenId);
    } catch (revokeErr) {
      console.error("Failed to revoke old refresh token:", revokeErr);
      // Non-fatal — proceed to issue new token
    }

    // ── 5. Issue new refresh token ────────────────────────────────────────────
    let newRefreshTokenId: string;
    let newRefreshToken:   string;

    try {
      const issued = await issueRefreshToken(userId, deviceId, deviceMeta);
      newRefreshTokenId = issued.tokenId;
      newRefreshToken   = issued.rawToken;
    } catch (issueErr: any) {
      console.error("Failed to issue new refresh token:", issueErr);
      return err("Internal Server Error", "Failed to rotate session", 500);
    }

    // ── 6. Sign new access token ──────────────────────────────────────────────
    const accessToken = await signAccessToken(
      { uid: userId, email, isBooker, deviceId },
      AUDIENCE
    );

    // ── 7. Build response + rotate cookies ────────────────────────────────────
    const response = NextResponse.json(
      {
        success:     true,
        message:     "Session refreshed successfully",
        accessToken,
        developer:   DEV_TAG,
      },
      { status: 200 }
    );

    setAuthCookies(response, accessToken, newRefreshToken, newRefreshTokenId);
    return response;
  } catch (error: any) {
    console.error("Token refresh error:", error);
    return err("Internal Server Error", "An unexpected error occurred", 500);
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function clearRefreshCookies(response: NextResponse): void {
  response.cookies.set(COOKIE_REFRESH_TOKEN, "", {
    maxAge: 0,
    path:   "/api/v1/auth/refresh",
  });
  response.cookies.set(COOKIE_REFRESH_TOKEN_ID, "", {
    maxAge: 0,
    path:   "/api/v1/auth/refresh",
  });
}
