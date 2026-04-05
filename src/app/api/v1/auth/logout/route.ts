/**
 * app/api/v1/auth/logout/route.ts
 *
 * POST /api/v1/auth/logout — Log out from user portal
 *
 * Revokes the Firestore refresh token and clears all spotix_u_* cookies.
 * Accepts expired access tokens — logout is always idempotent.
 *
 * Optional body:
 *   allDevices : boolean — revoke ALL refresh tokens for this user
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/app/lib/auth-tokens";
import {
  getRefreshTokenById,
  revokeRefreshToken,
  revokeAllTokensForUser,
} from "@/app/lib/refresh-token-repo";
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN_ID,
  clearAuthCookies,
} from "@/app/api/v1/auth/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIENCE = "spotix-user" as const;
const DEV_TAG = "API developed and maintained by Spotix Technologies";

function ok<T extends object>(data: T) {
  return NextResponse.json({ ...data, developer: DEV_TAG });
}

function err(error: string, message: string, status: number) {
  return NextResponse.json({ error, message, developer: DEV_TAG }, { status });
}

export async function POST(request: NextRequest) {
  // Always clear cookies — logout is idempotent
  const token = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;

  if (!token) {
    const res = ok({ success: true, message: "Logged out" });
    clearAuthCookies(res);
    return res;
  }

  // Expired tokens are fine here — we still want to clear the session
  let payload;
  try {
    payload = await verifyAccessToken(token, AUDIENCE);
  } catch {
    const res = ok({ success: true, message: "Logged out" });
    clearAuthCookies(res);
    return res;
  }

  let allDevices = false;
  try {
    const body = await request.json();
    allDevices = body?.allDevices === true;
  } catch {
    // Body is optional
  }

  if (allDevices) {
    await revokeAllTokensForUser(payload.uid);
    const res = ok({ success: true, message: "Logged out from all devices" });
    clearAuthCookies(res);
    return res;
  }

  // Single-device logout — revoke this device's refresh token
  const refreshTokenId = request.cookies.get(COOKIE_REFRESH_TOKEN_ID)?.value;
  if (refreshTokenId) {
    const stored = await getRefreshTokenById(refreshTokenId);
    if (stored && stored.userId === payload.uid) {
      await revokeRefreshToken(refreshTokenId);
    }
  }

  const res = ok({ success: true, message: "Logged out successfully" });
  clearAuthCookies(res);
  return res;
}