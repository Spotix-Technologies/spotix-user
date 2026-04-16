/**
 * app/api/v1/auth/logout/route.ts
 *
 * POST /api/v1/auth/logout — Invalidate current session (or all sessions)
 *
 * Body:
 *   allDevices : boolean  — if true, revoke ALL sessions for this user
 *                           if false (default), revoke only the current device
 *
 * The access token is read from the spotix_u_at cookie to identify the user.
 * If the access token is expired/invalid, the request is still processed
 * (cookies are cleared regardless) — best-effort logout.
 *
 * On success: clears all three auth cookies and returns 200.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken }         from "@/app/lib/auth-tokens";
import {
  revokeRefreshToken,
  revokeAllTokensForUser,
} from "@/app/lib/refresh-token-repo";
import {
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  COOKIE_REFRESH_TOKEN_ID,
  clearAuthCookies,
} from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIENCE = "spotix-user" as const;
const DEV_TAG  = "API developed and maintained by Spotix Technologies";

// ── POST /api/v1/auth/logout ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let allDevices = false;

  try {
    const body = await request.json();
    allDevices = Boolean(body?.allDevices);
  } catch {
    // Missing body — default to single-device logout
  }

  // ── 1. Identify user from access token (best-effort) ─────────────────────
  let uid:     string | null = null;
  let tokenId: string | null = null;

  const accessToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
  if (accessToken) {
    try {
      const payload = await verifyAccessToken(accessToken, AUDIENCE);
      uid = payload.uid;
    } catch {
      // Expired or invalid — still clear cookies below
    }
  }

  // Refresh token ID is needed to revoke the specific device session
  tokenId = request.cookies.get(COOKIE_REFRESH_TOKEN_ID)?.value || null;

  // ── 2. Revoke Firestore token(s) ──────────────────────────────────────────
  if (uid) {
    try {
      if (allDevices) {
        await revokeAllTokensForUser(uid);
      } else if (tokenId) {
        await revokeRefreshToken(tokenId);
      }
    } catch (revokeErr) {
      console.error("Logout revocation error:", revokeErr);
      // Non-fatal — always clear cookies
    }
  }

  // ── 3. Build response + clear all cookies ─────────────────────────────────
  const response = NextResponse.json(
    {
      success:   true,
      message:   allDevices
        ? "Logged out from all devices"
        : "Logged out successfully",
      developer: DEV_TAG,
    },
    { status: 200 }
  );

  clearAuthCookies(response);
  return response;
}
