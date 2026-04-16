/**
 * app/lib/auth-client-user.ts  — Spotix USER PORTAL auth client
 *
 * This module is the single source of truth for client-side auth state.
 * It is intentionally framework-agnostic: no React imports, no hooks.
 * The useAuth hook (app/hooks/useAuth.ts) wraps this module for React components.
 *
 * ── What this module owns ─────────────────────────────────────────────────────
 *
 *   _accessToken          In-memory access token (never touches localStorage)
 *   spotix_u_at_expiry    localStorage: access token expiry timestamp (ms)
 *   spotix_u_device_id    localStorage: stable device UUID
 *
 *   The actual tokens (spotix_u_at, spotix_u_rt, spotix_u_rtid) are httpOnly
 *   cookies — this module CANNOT read them. The server sets/clears them.
 *
 * ── Key design decisions ──────────────────────────────────────────────────────
 *
 *   1. Singleton refresh lock (_refreshPromise)
 *      When multiple components mount at the same time and all see an expired
 *      token, only ONE HTTP request is made. All callers share the same promise.
 *
 *   2. getSessionUser() is the UI auth gate
 *      Don't use Firebase onAuthStateChanged to drive isAuthenticated.
 *      Firebase Auth is only used at login time to exchange credentials for
 *      an ID token. After that, our JWT is the source of truth.
 *
 *   3. authFetch() only for AUTHENTICATED endpoints
 *      Do NOT call authFetch for public/guest endpoints. Unauthenticated
 *      callers will be redirected to /auth/login.
 *
 *   4. logout() clears the sessionStorage event cache
 *      Prevents a re-login as a different user from seeing stale event data.
 */

// ── In-memory state ───────────────────────────────────────────────────────────

let _accessToken:    string | null          = null;
let _refreshPromise: Promise<boolean> | null = null;

// ── localStorage keys ─────────────────────────────────────────────────────────

const KEYS = {
  deviceId: "spotix_u_device_id",
  atExpiry: "spotix_u_at_expiry",
} as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeviceMeta {
  platform:   string;
  model:      string;
  appVersion: string;
}

export interface SessionUser {
  uid:      string;
  email:    string;
  isBooker: boolean;
  deviceId: string;
}

// ── Access token helpers ──────────────────────────────────────────────────────

/**
 * Store an access token in memory and persist its expiry to localStorage.
 * Called after login and after each successful refresh.
 */
export function storeAccessToken(accessToken: string, expiresInSeconds = 900): void {
  _accessToken       = accessToken;
  const expiresAt    = Date.now() + expiresInSeconds * 1000;
  if (typeof window !== "undefined") {
    localStorage.setItem(KEYS.atExpiry, String(expiresAt));
  }
}

export function getAccessToken(): string | null {
  return _accessToken;
}

/**
 * Returns true if the access token is missing or within 30 seconds of expiry.
 * The 30-second buffer prevents edge cases where a token expires mid-request.
 */
export function isAccessTokenExpired(): boolean {
  if (!_accessToken) return true;
  if (typeof window === "undefined") return true;
  const expiry = Number(localStorage.getItem(KEYS.atExpiry) || "0");
  return Date.now() > expiry - 30_000;
}

export function clearAccessToken(): void {
  _accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEYS.atExpiry);
  }
}

// ── Device ID ─────────────────────────────────────────────────────────────────

/**
 * Get or create a stable device UUID from localStorage.
 * Used to enforce single-session-per-device on the server.
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(KEYS.deviceId);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEYS.deviceId, id);
  }
  return id;
}

// ── Device metadata ───────────────────────────────────────────────────────────

export function collectDeviceMeta(): DeviceMeta {
  if (typeof window === "undefined") {
    return { platform: "ssr", model: "unknown", appVersion: "unknown" };
  }
  const ua = navigator.userAgent;
  let platform = "web";
  if      (/android/i.test(ua))          platform = "android-web";
  else if (/iphone|ipad|ipod/i.test(ua)) platform = "ios-web";
  else if (/macintosh/i.test(ua))        platform = "macos-web";
  else if (/windows/i.test(ua))          platform = "windows-web";

  let model = "unknown";
  if      (/firefox/i.test(ua)) model = "Firefox";
  else if (/edg/i.test(ua))     model = "Edge";
  else if (/chrome/i.test(ua))  model = "Chrome";
  else if (/safari/i.test(ua))  model = "Safari";

  return {
    platform,
    model,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  };
}

// ── Session check — primary UI auth gate ─────────────────────────────────────

/**
 * Verify the user's session via GET /api/v1/auth (reads spotix_u_at cookie).
 *
 * USE THIS to determine if a user is logged in — not Firebase onAuthStateChanged.
 * Firebase Auth is only needed at login time to get an ID token.
 *
 * Flow:
 *   1. Hit GET /api/v1/auth to verify the current access token (cookie)
 *   2. If authenticated → return SessionUser
 *   3. If not authenticated (token missing or expired) → attempt silent refresh
 *   4. If refresh succeeds → retry the session check → return SessionUser
 *   5. If refresh fails → return null (user must log in again)
 *
 * Never throws — returns null for any unauthenticated or error state.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const check = async (): Promise<SessionUser | null> => {
      const res = await fetch("/api/v1/auth", {
        method:      "GET",
        credentials: "same-origin",
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.authenticated) return null;
      return {
        uid:      data.uid,
        email:    data.email,
        isBooker: data.isBooker,
        deviceId: data.deviceId,
      };
    };

    const user = await check();
    if (user) return user;

    // Token may be expired — silent refresh then one retry
    const refreshed = await tryRefreshTokens();
    if (!refreshed) return null;
    return await check();
  } catch {
    return null;
  }
}

// ── Token refresh (singleton-locked) ─────────────────────────────────────────

async function _doRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method:      "POST",
      headers:     { "Content-Type": "application/json" },
      credentials: "same-origin",
      body:        JSON.stringify({ deviceMeta: collectDeviceMeta() }),
    });
    if (!res.ok) {
      clearAccessToken();
      return false;
    }
    const data = await res.json();
    if (data.accessToken) storeAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

/**
 * Silently refresh tokens using the spotix_u_rt httpOnly cookie.
 *
 * Singleton-locked: if a refresh is already in-flight, all concurrent callers
 * await the same Promise — only one HTTP request is ever made at a time.
 * This prevents thundering-herd refresh storms on page load.
 */
export async function tryRefreshTokens(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = _doRefresh().finally(() => {
    _refreshPromise = null;
  });
  return _refreshPromise;
}

// ── Authenticated fetch ───────────────────────────────────────────────────────

/**
 * Drop-in replacement for fetch() on AUTHENTICATED endpoints only.
 *
 * ⚠️  Do NOT call this for public/guest-accessible endpoints.
 *     Unauthenticated callers will be redirected to /auth/login.
 *
 * Flow:
 *   1. Proactively refresh if the in-memory token is expired or near expiry
 *   2. Redirect to login if proactive refresh fails
 *   3. Inject Authorization: Bearer <token> header
 *   4. On 401 response, attempt one reactive refresh and retry
 *   5. Redirect to login if reactive refresh also fails
 */
export async function authFetch(
  input: RequestInfo | URL,
  init:  RequestInit = {}
): Promise<Response> {
  // Step 1 — proactive refresh
  if (isAccessTokenExpired()) {
    const refreshed = await tryRefreshTokens();
    if (!refreshed) {
      redirectToLogin();
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  const buildInit = (): RequestInit => ({
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
    },
  });

  let response = await fetch(input, buildInit());

  // Step 4 — reactive refresh on 401
  if (response.status === 401) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      response = await fetch(input, buildInit());
    } else {
      clearAccessToken();
      redirectToLogin();
    }
  }

  return response;
}

// ── Logout ────────────────────────────────────────────────────────────────────

/**
 * Log out the current device.
 * Calls POST /api/v1/auth/logout, clears in-memory token,
 * wipes sessionStorage event cache, then redirects.
 */
export async function logout(redirectTo = "/auth/login"): Promise<void> {
  try {
    await fetch("/api/v1/auth/logout", {
      method:      "POST",
      credentials: "same-origin",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ allDevices: false }),
    });
  } catch {
    // best-effort — always clear local state
  }
  clearAccessToken();
  clearEventCache();
  if (typeof window !== "undefined") window.location.href = redirectTo;
}

/**
 * Log out from ALL devices.
 * Revokes every active refresh token for this user in Firestore.
 */
export async function logoutAllDevices(redirectTo = "/auth/login"): Promise<void> {
  try {
    await fetch("/api/v1/auth/logout", {
      method:      "POST",
      credentials: "same-origin",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify({ allDevices: true }),
    });
  } catch {
    // best-effort
  }
  clearAccessToken();
  clearEventCache();
  if (typeof window !== "undefined") window.location.href = redirectTo;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.href = `/auth/login?redirect=${encodeURIComponent(
      window.location.pathname
    )}`;
  }
}

/**
 * Wipe all event_* entries from sessionStorage.
 * Called on logout so a re-login as a different user can't see
 * the previous user's cached event data or like counts.
 */
function clearEventCache(): void {
  if (typeof window === "undefined") return;
  const toRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith("event_")) toRemove.push(key);
  }
  toRemove.forEach((k) => sessionStorage.removeItem(k));
}
