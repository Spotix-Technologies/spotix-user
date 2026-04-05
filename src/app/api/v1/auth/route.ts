/**
 * app/api/v1/auth/route.ts
 *
 * POST /api/v1/auth  — User portal login
 * GET  /api/v1/auth  — Session check
 *
 * 
 * This route is the user-facing equivalent of the booker's /api/auth route.
 * Both portals share the same:
 *   - ACCESS_TOKEN_SECRET env var
 *   - lib/auth-tokens.ts token infrastructure
 *   - lib/refresh-token-repo.ts Firestore helpers
 *   - refreshTokens/{tokenId} Firestore collection
 *
 * They are separated by JWT audience:
 *   - Booker tokens: aud = "spotix-booker"
 *   - User tokens:   aud = "spotix-user"
 *
 * A token issued here will be rejected by the booker middleware (and vice versa)
 * even though both use the same secret.
 *
 * ── Cookie names (user portal) ────────────────────────────────────────────────
 *
 *   spotix_u_at    httpOnly, Secure, SameSite=Lax, Max-Age=15min, Path=/
 *                  JWT access token for the user portal.
 *                  Read by the user portal middleware.
 *
 *   spotix_u_rt    httpOnly, Secure, SameSite=Lax, Max-Age=30d,
 *                  Path=/api/v1/auth/refresh
 *                  Raw refresh token — never readable by client JS.
 *
 *   spotix_u_rtid  httpOnly, Secure, SameSite=Lax, Max-Age=30d,
 *                  Path=/api/v1/auth/refresh
 *                  Firestore document ID of the refresh token record.
 *
 * All three are distinct from the booker portal cookies (spotix_at, spotix_rt,
 * spotix_rtid) so both portals can coexist in the same browser without conflict.
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/app/lib/firebase-admin";
import {
  signAccessToken,
  verifyAccessToken,
  newDeviceId,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_DAYS,
  type DeviceMeta,
} from "@/app/lib/auth-tokens";
import {
  revokeActiveTokensForDevice,
  issueRefreshToken,
} from "@/app/lib/refresh-token-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Cookie names (user portal — distinct from booker portal) ──────────────────
export const COOKIE_ACCESS_TOKEN = "spotix_u_at";
export const COOKIE_REFRESH_TOKEN = "spotix_u_rt";
export const COOKIE_REFRESH_TOKEN_ID = "spotix_u_rtid";

const IS_PROD = process.env.NODE_ENV === "production";
const AUDIENCE = "spotix-user" as const;
const DEV_TAG = "API developed and maintained by Spotix Technologies";

// ── Response helpers ───────────────────────────────────────────────────────────
function ok<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ...data, developer: DEV_TAG }, { status });
}

function err(error: string, message: string, status: number, details?: string) {
  return NextResponse.json(
    { error, message, ...(details ? { details } : {}), developer: DEV_TAG },
    { status }
  );
}

// ── Cookie helpers (exported for refresh + logout routes) ─────────────────────
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
  refreshTokenId: string
): void {
  response.cookies.set(COOKIE_ACCESS_TOKEN, accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
    path: "/",
  });

  const refreshMaxAge = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

  response.cookies.set(COOKIE_REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    maxAge: refreshMaxAge,
    path: "/api/v1/auth/refresh",
  });

  response.cookies.set(COOKIE_REFRESH_TOKEN_ID, refreshTokenId, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    maxAge: refreshMaxAge,
    path: "/api/v1/auth/refresh",
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(COOKIE_ACCESS_TOKEN, "", { maxAge: 0, path: "/" });
  response.cookies.set(COOKIE_REFRESH_TOKEN, "", {
    maxAge: 0,
    path: "/api/v1/auth/refresh",
  });
  response.cookies.set(COOKIE_REFRESH_TOKEN_ID, "", {
    maxAge: 0,
    path: "/api/v1/auth/refresh",
  });
}

// ── POST /api/v1/auth ─────────────────────────────────────────────────────────
/**
 * Body:
 *   idToken    : string   — Firebase ID token from client SDK
 *   deviceId   : string?  — Stable UUID from client; generated server-side if absent
 *   deviceMeta : object?  — { platform, model, appVersion }
 *
 * Response (JSON + httpOnly cookies):
 *   accessToken      : string  — also set as spotix_u_at cookie
 *   refreshExpiresAt : string  — ISO date
 *   user             : object
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, deviceMeta = {} } = body as {
      idToken: string;
      deviceId?: string;
      deviceMeta?: DeviceMeta;
    };

    if (!idToken) {
      return err("Bad Request", "ID token is required", 400);
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, true /* force refresh */);
    } catch (firebaseErr: any) {
      const isExpired =
        firebaseErr.code === "auth/id-token-expired" ||
        firebaseErr.message?.includes("expired");
      return err(
        "Unauthorized",
        isExpired
          ? "Authentication token has expired. Please login again"
          : "Invalid authentication token",
        401,
        firebaseErr.message
      );
    }

    const { uid, email } = decodedToken;
    const deviceId: string = (body.deviceId as string | undefined) || newDeviceId();

    // Fetch user profile
    let userData: FirebaseFirestore.DocumentData;
    let isBooker = false;
    let balance = 0;

    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        return err("Not Found", "User profile not found", 404);
      }
      userData = userDoc.data()!;
      isBooker = userData.isBooker || false;
    } catch (firestoreErr: any) {
      console.error("Firestore user fetch error:", firestoreErr);
      return err("Database Error", "Unable to retrieve user data", 500);
    }

    // Fetch IWSS balance (non-fatal)
    try {
      const iwssDoc = await adminDb.collection("IWSS").doc(uid).get();
      if (iwssDoc.exists) balance = iwssDoc.data()?.balance || 0;
    } catch {
      // non-fatal
    }

    // Revoke existing active tokens for this device before issuing new ones
    try {
      await revokeActiveTokensForDevice(uid, deviceId);
    } catch (revokeErr) {
      console.error("Token revocation error:", revokeErr);
    }

    // Issue refresh token (Firestore, bcrypt-hashed)
    const {
      tokenId: refreshTokenId,
      rawToken: refreshToken,
      expiresAt: refreshExpiresAt,
    } = await issueRefreshToken(uid, deviceId, deviceMeta);

    // Sign access token with user portal audience
    const accessToken = await signAccessToken(
      { uid, email: email!, isBooker, deviceId },
      AUDIENCE
    );

    // Update last login (non-fatal)
    adminDb
      .collection("users")
      .doc(uid)
      .update({ lastLogin: new Date().toISOString() })
      .catch((e) => console.error("lastLogin update failed:", e));

    const response = NextResponse.json(
      {
        success: true,
        message: "Session created successfully",
        accessToken,
        refreshExpiresAt: refreshExpiresAt.toISOString(),
        user: {
          uid,
          email,
          username: userData.username || "",
          fullName: userData.fullName || "",
          isBooker,
          balance,
          createdAt: userData.createdAt || "",
          lastLogin: new Date().toISOString(),
        },
        developer: DEV_TAG,
      },
      { status: 200 }
    );

    setAuthCookies(response, accessToken, refreshToken, refreshTokenId);
    return response;
  } catch (error: any) {
    console.error("User login error:", error);
    return err("Internal Server Error", "An unexpected error occurred", 500, error.message);
  }
}

// ── GET /api/v1/auth ──────────────────────────────────────────────────────────
/**
 * Stateless session check.
 * Reads spotix_u_at cookie first, falls back to Authorization: Bearer header.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
    const headerToken = request.headers.get("Authorization")?.replace("Bearer ", "");
    const token = cookieToken || headerToken;

    if (!token) {
      return ok({ authenticated: false, message: "No access token provided" });
    }

    try {
      const payload = await verifyAccessToken(token, AUDIENCE);
      return ok({
        authenticated: true,
        uid: payload.uid,
        email: payload.email,
        isBooker: payload.isBooker,
        deviceId: payload.deviceId,
      });
    } catch (jwtErr: any) {
      return ok({
        authenticated: false,
        message:
          jwtErr.code === "ERR_JWT_EXPIRED"
            ? "Access token expired"
            : "Invalid access token",
      });
    }
  } catch (error: any) {
    console.error("User session check error:", error);
    return err("Internal Server Error", "Session check failed", 500, error.message);
  }
}