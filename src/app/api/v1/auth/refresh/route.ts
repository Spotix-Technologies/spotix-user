/**
 * app/api/v1/auth/refresh/route.ts
 *
 * POST /api/v1/auth/refresh — Silent token refresh for user portal
 *
 * Flow:
 *   1. Reads spotix_u_rt (refresh token) from httpOnly cookie
 *   2. Reads spotix_u_rtid (token document ID) from httpOnly cookie
 *   3. Verifies the refresh token against the stored hash
 *   4. Issues a new access token + rotates the refresh token
 *   5. Returns new access token; sets new refresh token cookie
 *
 * The client calls this when its access token expires, before making
 * an authenticated request. See auth-client.ts tryRefreshTokens().
 *
 * Body (optional):
 *   deviceMeta : { platform, model, appVersion }
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshTokenHash, signAccessToken, type AccessTokenPayload } from "@/app/lib/auth-tokens";
import {
  getRefreshTokenById,
  rotateRefreshToken,
  touchRefreshToken,
} from "@/app/lib/refresh-token-repo";
import { adminDb } from "@/app/lib/firebase-admin";
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_REFRESH_TOKEN_ID,
  setAuthCookies,
} from "@/app/api/v1/auth/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIENCE = "spotix-user" as const;
const DEV_TAG = "API developed and maintained by Spotix Technologies";

function ok<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ...data, developer: DEV_TAG }, { status });
}

function err(error: string, message: string, status: number, details?: string) {
  return NextResponse.json(
    { error, message, ...(details ? { details } : {}), developer: DEV_TAG },
    { status }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Read refresh token cookies
    const rawRefreshToken = request.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
    const refreshTokenId = request.cookies.get(COOKIE_REFRESH_TOKEN_ID)?.value;

    if (!rawRefreshToken || !refreshTokenId) {
      return err("Unauthorized", "Refresh token not found", 401);
    }

    // Fetch stored refresh token from Firestore
    const storedToken = await getRefreshTokenById(refreshTokenId);

    if (!storedToken) {
      return err("Unauthorized", "Refresh token not found", 401);
    }

    if (storedToken.isRevoked) {
      return err("Unauthorized", "Refresh token has been revoked", 401);
    }

    const now = new Date();
    if (now > storedToken.expiresAt) {
      return err("Unauthorized", "Refresh token has expired", 401);
    }

    // Verify the raw refresh token against the stored bcrypt hash
    const isValid = await verifyRefreshTokenHash(rawRefreshToken, storedToken.tokenHash);
    if (!isValid) {
      return err("Unauthorized", "Invalid refresh token", 401);
    }

    // Fetch user data to get email and isBooker for the new access token
    let userData: FirebaseFirestore.DocumentData;
    try {
      const userDoc = await adminDb.collection("users").doc(storedToken.userId).get();
      if (!userDoc.exists) {
        return err("Not Found", "User not found", 404);
      }
      userData = userDoc.data()!;
    } catch (error: any) {
      console.error("Firestore user fetch error:", error);
      return err("Database Error", "Unable to retrieve user data", 500);
    }

    // Parse device metadata from request body (optional)
    let deviceMeta = storedToken.deviceMeta || { platform: "unknown", model: "unknown", appVersion: "unknown" };
    try {
      const body = await request.json();
      if (body.deviceMeta) {
        deviceMeta = { ...deviceMeta, ...body.deviceMeta };
      }
    } catch {
      // Body is optional
    }

    // Rotate refresh token (revoke old, issue new)
    const { tokenId: newTokenId, rawToken: newRawToken, expiresAt: newExpiresAt } =
      await rotateRefreshToken(refreshTokenId, storedToken.userId, storedToken.deviceId, deviceMeta);

    // Sign new access token
    const newAccessToken = await signAccessToken(
      {
        uid: storedToken.userId,
        email: userData.email || "",
        isBooker: userData.isBooker || false,
        deviceId: storedToken.deviceId,
      },
      AUDIENCE
    );

    // Update lastUsedAt for the new token (non-fatal)
    touchRefreshToken(newTokenId).catch((e) => console.error("touchRefreshToken failed:", e));

    const response = NextResponse.json(
      {
        success: true,
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
        refreshExpiresAt: newExpiresAt.toISOString(),
      },
      { status: 200 }
    );

    // Set new cookies with rotated refresh token
    setAuthCookies(response, newAccessToken, newRawToken, newTokenId);

    return response;
  } catch (error: any) {
    console.error("Token refresh error:", error);
    return err("Internal Server Error", "Token refresh failed", 500, error.message);
  }
}
