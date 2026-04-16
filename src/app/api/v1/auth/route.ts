/**
 * app/api/v1/auth/route.ts
 *
 * POST /api/v1/auth  — Login: exchange Firebase ID token for Spotix JWT session
 * GET  /api/v1/auth  — Session check: verify the current access token
 *
 * ── Cookie names (user portal) ────────────────────────────────────────────────
 *
 *   spotix_u_at    httpOnly, Secure, SameSite=Lax, Max-Age=15min, Path=/
 *                  Short-lived JWT access token. Read by middleware on every request.
 *
 *   spotix_u_rt    httpOnly, Secure, SameSite=Lax, Max-Age=30d,
 *                  Path=/api/v1/auth/refresh
 *                  Raw refresh token. Scoped to the refresh endpoint only.
 *                  Never readable by client JS.
 *
 *   spotix_u_rtid  httpOnly, Secure, SameSite=Lax, Max-Age=30d,
 *                  Path=/api/v1/auth/refresh
 *                  Firestore document ID of the refresh token record.
 *
 * These are intentionally distinct from the booker portal cookies
 * (spotix_at, spotix_rt, spotix_rtid) so both portals can coexist in
 * the same browser session without collision.
 *
 * ── Audience separation ───────────────────────────────────────────────────────
 *
 *   Tokens issued here carry aud = "spotix-user".
 *   The middleware rejects any token with a different audience,
 *   preventing cross-portal token replay attacks.
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

// ── Constants ─────────────────────────────────────────────────────────────────

export const COOKIE_ACCESS_TOKEN    = "spotix_u_at";
export const COOKIE_REFRESH_TOKEN   = "spotix_u_rt";
export const COOKIE_REFRESH_TOKEN_ID = "spotix_u_rtid";

const IS_PROD  = process.env.NODE_ENV === "production";
const AUDIENCE = "spotix-user" as const;
const DEV_TAG  = "API developed and maintained by Spotix Technologies";

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

// ── Cookie helpers (exported so /refresh and /logout can reuse) ───────────────

export function setAuthCookies(
  response:       NextResponse,
  accessToken:    string,
  refreshToken:   string,
  refreshTokenId: string
): void {
  response.cookies.set(COOKIE_ACCESS_TOKEN, accessToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "lax",
    maxAge:   ACCESS_TOKEN_TTL_SECONDS,
    path:     "/",
  });

  const refreshMaxAge = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;

  response.cookies.set(COOKIE_REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "lax",
    maxAge:   refreshMaxAge,
    path:     "/api/v1/auth/refresh",
  });

  response.cookies.set(COOKIE_REFRESH_TOKEN_ID, refreshTokenId, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: "lax",
    maxAge:   refreshMaxAge,
    path:     "/api/v1/auth/refresh",
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(COOKIE_ACCESS_TOKEN, "", {
    maxAge: 0,
    path:   "/",
  });
  response.cookies.set(COOKIE_REFRESH_TOKEN, "", {
    maxAge: 0,
    path:   "/api/v1/auth/refresh",
  });
  response.cookies.set(COOKIE_REFRESH_TOKEN_ID, "", {
    maxAge: 0,
    path:   "/api/v1/auth/refresh",
  });
}

// ── POST /api/v1/auth ─────────────────────────────────────────────────────────
/**
 * Exchange a Firebase ID token for a Spotix JWT session.
 *
 * Body:
 *   idToken    : string   — Firebase ID token from signInWithEmailAndPassword
 *   deviceId   : string?  — Stable UUID from client (auto-generated if absent)
 *   deviceMeta : object?  — { platform, model, appVersion }
 *
 * Response (200):
 *   accessToken      : string  — also set as spotix_u_at cookie
 *   refreshExpiresAt : string  — ISO date (30 days)
 *   user             : UserProfile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, deviceMeta = {} } = body as {
      idToken:    string;
      deviceId?:  string;
      deviceMeta?: DeviceMeta;
    };

    if (!idToken) {
      return err("Bad Request", "ID token is required", 400);
    }

    // ── 1. Verify Firebase ID token ──────────────────────────────────────────
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, true);
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

    const { uid, email }  = decodedToken;
    const deviceId: string = (body.deviceId as string | undefined) || newDeviceId();

    // ── 2. Fetch user profile from Firestore ──────────────────────────────────
    let userData: FirebaseFirestore.DocumentData;
    let isBooker  = false;
    let balance   = 0;

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

    // ── 3. Fetch wallet / IWSS balance (non-fatal) ────────────────────────────
    try {
      const iwssDoc = await adminDb.collection("IWSS").doc(uid).get();
      if (iwssDoc.exists) balance = iwssDoc.data()?.balance || 0;
    } catch {
      // non-fatal
    }

    // ── 4. Single-session-per-device: revoke existing active tokens ───────────
    try {
      await revokeActiveTokensForDevice(uid, deviceId);
    } catch (revokeErr) {
      console.error("Token revocation error:", revokeErr);
    }

    // ── 5. Issue new refresh token (Firestore-stored, bcrypt-hashed) ──────────
    const {
      tokenId: refreshTokenId,
      rawToken: refreshToken,
      expiresAt: refreshExpiresAt,
    } = await issueRefreshToken(uid, deviceId, deviceMeta);

    // ── 6. Sign access token ──────────────────────────────────────────────────
    const accessToken = await signAccessToken(
      { uid, email: email!, isBooker, deviceId },
      AUDIENCE
    );

    // ── 7. Update lastLogin (non-fatal, fire-and-forget) ─────────────────────
    adminDb
      .collection("users")
      .doc(uid)
      .update({ lastLogin: new Date().toISOString() })
      .catch((e) => console.error("lastLogin update failed:", e));

    // ── 8. Build response + set cookies ──────────────────────────────────────
    const response = NextResponse.json(
      {
        success:          true,
        message:          "Session created successfully",
        accessToken,
        refreshExpiresAt: refreshExpiresAt.toISOString(),
        user: {
          uid,
          email,
          username:   userData.username   || "",
          fullName:   userData.fullName   || "",
          isBooker,
          balance,
          createdAt:  userData.createdAt  || "",
          lastLogin:  new Date().toISOString(),
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
 * Stateless session check — reads spotix_u_at cookie (or Authorization header).
 *
 * Returns { authenticated: true, uid, email, isBooker, deviceId } on success.
 * Returns { authenticated: false, message } — never 401 — so the client can
 * silently attempt a refresh without a server error response.
 */
export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value;
    const headerToken = request.headers.get("Authorization")?.replace("Bearer ", "");
    const token       = cookieToken || headerToken;

    if (!token) {
      return ok({ authenticated: false, message: "No access token provided" });
    }

    try {
      const payload = await verifyAccessToken(token, AUDIENCE);
      return ok({
        authenticated: true,
        uid:      payload.uid,
        email:    payload.email,
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
