/**
 * proxy.ts  — User Portal
 *
 * Authentication and route protection for the Spotix user-facing app.
 *
 * ── How it differs from the booker proxy ─────────────────────────────────
 *
 *   Cookie read : spotix_u_at  (not spotix_at)
 *   JWT audience: "spotix-user" (not "spotix-booker")
 *   Role check  : none — all authenticated users can access protected routes
 *                 regardless of isBooker. The booker check only lives in the
 *                 booker dashboard proxy.
 *
 * ── Route classification ──────────────────────────────────────────────────────
 *
 *   Public       /auth/login, /auth/signup, /auth/forgot-password
 *                Always accessible. Authenticated users visiting login/signup
 *                are redirected to /home.
 *
 *   Protected    /payment, /ticket-history, /profile, /Referrals,
 *                /iwss, /refund, /refund-track, /vote  (+ sub-paths)
 *                Requires a valid spotix_u_at JWT. Unauthenticated users are
 *                redirected to /auth/login?redirect=<path>.
 *
 *   Open         Everything else (home, event listings, etc.)
 *                No auth required — accessible to everyone.
 *
 * ── Identity headers injected for downstream use ──────────────────────────────
 *
 *   x-user-id          ← uid from verified JWT
 *   x-user-email       ← email
 *   x-user-is-booker   ← "true" | "false"
 *   x-device-id        ← deviceId
 *
 * Usage in a server component or API route:
 *   import { headers } from "next/headers"
 *   const uid = (await headers()).get("x-user-id")
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessTokenEdge } from "@/app/lib/auth-edge";

// ── Route sets ─────────────────────────────────────────────────────────────────

const PUBLIC_AUTH_ROUTES = new Set([
  "/auth/login",
  "/auth/signup",
  "/auth/forgot-password",
]);

/**
 * Protected route prefixes — any path that starts with one of these
 * (including sub-paths) requires authentication.
 */
const PROTECTED_PREFIXES = [
  "/ticket-history",
  "/profile",
  "/Referrals",
  "/iwss",
  "/refund",
  "/refund-track",
  "/vote",
];

// ── Cookie name (must match app/api/v1/auth/route.ts) ─────────────────────────
const ACCESS_TOKEN_COOKIE = "spotix_u_at";
const AUDIENCE = "spotix-user" as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.has(pathname);
}

// ── proxy ─────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const payload = await verifyAccessTokenEdge(token, AUDIENCE);

  // ── 1. Public auth routes (/auth/login, /auth/signup, etc.) ─────────────────
if (isPublicAuthRoute(pathname)) {
  if (payload) {
    return NextResponse.redirect(new URL("/home", request.url));
  }
  return NextResponse.next();
}

  // ── 2. Protected routes ──────────────────────────────────────────────────────
  if (isProtectedRoute(pathname)) {
    if (!payload) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated — forward verified identity to server components / API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.uid);
    requestHeaders.set("x-user-email", payload.email);
    // requestHeaders.set("x-user-is-booker", String(payload.isBooker));
    requestHeaders.set("x-device-id", payload.deviceId);

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── 3. Open routes — no auth required ───────────────────────────────────────
  // Inject identity headers if the user happens to be logged in,
  // so server components can personalise content without an extra auth check.
  if (payload) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", payload.uid);
    requestHeaders.set("x-user-email", payload.email);
    // requestHeaders.set("x-user-is-booker", String(payload.isBooker));
    requestHeaders.set("x-device-id", payload.deviceId);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

// ── Matcher ────────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf)).*)",
  ],
};