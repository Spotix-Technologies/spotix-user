/**
 * lib/auth-client-user.ts
 *
 * Client-side auth utilities for the Spotix USER PORTAL.
 *
 * Mirrors lib/auth-client.ts (booker portal) but:
 *   - Calls  /api/v1/auth, /api/v1/auth/refresh, /api/v1/auth/logout
 *   - Uses   spotix_u_* localStorage keys (avoids collision with booker keys
 *     if both apps somehow run in the same browser origin — unlikely but safe)
 *   - No isBooker routing logic — user portal doesn't gate on booker status
 *
 * Token storage strategy (identical to booker portal):
 *   Access token  → JS memory (_accessToken) + spotix_u_at httpOnly cookie
 *   Refresh token → spotix_u_rt httpOnly cookie only (JS never sees it)
 *   localStorage  → device ID + access token expiry timestamp only
 */

// ── In-memory access token ─────────────────────────────────────────────────────
let _accessToken: string | null = null;

// ── localStorage keys ──────────────────────────────────────────────────────────
const KEYS = {
  deviceId: "spotix_u_device_id",
  atExpiry: "spotix_u_at_expiry",
} as const;

// ── Types ──────────────────────────────────────────────────────────────────────
export interface DeviceMeta {
  platform: string;
  model: string;
  appVersion: string;
}

// ── Access token ───────────────────────────────────────────────────────────────

export function storeAccessToken(accessToken: string, expiresInSeconds = 900): void {
  _accessToken = accessToken;
  const expiresAt = Date.now() + expiresInSeconds * 1000;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEYS.atExpiry, String(expiresAt));
  }
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function isAccessTokenExpired(): boolean {
  if (!_accessToken) return true;
  if (typeof window === "undefined") return true;
  const expiry = Number(localStorage.getItem(KEYS.atExpiry) || "0");
  return Date.now() > expiry - 30_000; // 30s early buffer
}

export function clearAccessToken(): void {
  _accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEYS.atExpiry);
  }
}

// ── Device ID ──────────────────────────────────────────────────────────────────

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(KEYS.deviceId);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEYS.deviceId, id);
  }
  return id;
}

// ── Device metadata ────────────────────────────────────────────────────────────

export function collectDeviceMeta(): DeviceMeta {
  if (typeof window === "undefined") {
    return { platform: "ssr", model: "unknown", appVersion: "unknown" };
  }

  const ua = navigator.userAgent;
  let platform = "web";
  if (/android/i.test(ua)) platform = "android-web";
  else if (/iphone|ipad|ipod/i.test(ua)) platform = "ios-web";
  else if (/macintosh/i.test(ua)) platform = "macos-web";
  else if (/windows/i.test(ua)) platform = "windows-web";

  let model = "unknown";
  if (/firefox/i.test(ua)) model = "Firefox";
  else if (/edg/i.test(ua)) model = "Edge";
  else if (/chrome/i.test(ua)) model = "Chrome";
  else if (/safari/i.test(ua)) model = "Safari";

  return {
    platform,
    model,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  };
}

// ── Token refresh ──────────────────────────────────────────────────────────────

/**
 * Silently refresh tokens.
 * Browser sends spotix_u_rt + spotix_u_rtid cookies automatically.
 * Returns true on success, false on failure.
 */
export async function tryRefreshTokens(): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ deviceMeta: collectDeviceMeta() }),
    });

    if (!res.ok) {
      clearAccessToken();
      return false;
    }

    const data = await res.json();
    if (data.accessToken) {
      storeAccessToken(data.accessToken);
    }
    return true;
  } catch {
    return false;
  }
}

// ── Authenticated fetch ────────────────────────────────────────────────────────

/**
 * Drop-in fetch replacement that:
 *   1. Proactively refreshes if access token is expired or about to expire
 *   2. Injects Authorization: Bearer header
 *   3. Retries once on reactive 401
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  if (isAccessTokenExpired()) {
    const refreshed = await tryRefreshTokens();
    if (!refreshed) {
      if (typeof window !== "undefined") {
        window.location.href = `/auth/login?redirect=${encodeURIComponent(
          window.location.pathname
        )}`;
      }
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  const withAuth = (): RequestInit => ({
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
    },
  });

  let response = await fetch(input, withAuth());

  if (response.status === 401) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      response = await fetch(input, withAuth());
    } else {
      clearAccessToken();
      if (typeof window !== "undefined") {
        window.location.href = `/auth/login?redirect=${encodeURIComponent(
          window.location.pathname
        )}`;
      }
    }
  }

  return response;
}

// ── Logout ─────────────────────────────────────────────────────────────────────

export async function logout(redirectTo = "/auth/login"): Promise<void> {
  try {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allDevices: false }),
    });
  } catch {
    // best-effort
  }
  clearAccessToken();
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}

export async function logoutAllDevices(redirectTo = "/auth/login"): Promise<void> {
  try {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allDevices: true }),
    });
  } catch {
    // best-effort
  }
  clearAccessToken();
  if (typeof window !== "undefined") {
    window.location.href = redirectTo;
  }
}