/**
 * lib/auth-client-user.ts  — Spotix USER PORTAL
 *
 * Fixes applied vs original:
 *   1. Singleton refresh lock (_refreshPromise) — one HTTP call even when
 *      multiple components mount simultaneously and all see an expired token.
 *   2. authFetch only redirects authenticated callers. Callers must guard
 *      themselves (don't call authFetch for guest-accessible endpoints).
 *   3. getSessionUser() — server-verified auth check via GET /api/v1/auth.
 *      Use this instead of Firebase onAuthStateChanged to drive isAuthenticated
 *      in the UI. Handles expired token by attempting a silent refresh.
 *   4. logout() clears the event sessionStorage cache so a re-login as a
 *      different user doesn't see stale likeCount or event data.
 */

// ── In-memory access token ────────────────────────────────────────────────────
let _accessToken: string | null = null

// ── Singleton refresh lock ────────────────────────────────────────────────────
let _refreshPromise: Promise<boolean> | null = null

// ── localStorage keys ─────────────────────────────────────────────────────────
const KEYS = {
  deviceId: "spotix_u_device_id",
  atExpiry: "spotix_u_at_expiry",
} as const

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DeviceMeta {
  platform: string
  model: string
  appVersion: string
}

export interface SessionUser {
  uid: string
  email: string
  isBooker: boolean
  deviceId: string
}

// ── Access token helpers ──────────────────────────────────────────────────────

export function storeAccessToken(accessToken: string, expiresInSeconds = 900): void {
  _accessToken = accessToken
  const expiresAt = Date.now() + expiresInSeconds * 1000
  if (typeof window !== "undefined") {
    localStorage.setItem(KEYS.atExpiry, String(expiresAt))
  }
}

export function getAccessToken(): string | null {
  return _accessToken
}

export function isAccessTokenExpired(): boolean {
  if (!_accessToken) return true
  if (typeof window === "undefined") return true
  const expiry = Number(localStorage.getItem(KEYS.atExpiry) || "0")
  return Date.now() > expiry - 30_000 // 30s early buffer
}

export function clearAccessToken(): void {
  _accessToken = null
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEYS.atExpiry)
  }
}

// ── Device ID ─────────────────────────────────────────────────────────────────

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr"
  let id = localStorage.getItem(KEYS.deviceId)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEYS.deviceId, id)
  }
  return id
}

// ── Device metadata ───────────────────────────────────────────────────────────

export function collectDeviceMeta(): DeviceMeta {
  if (typeof window === "undefined") {
    return { platform: "ssr", model: "unknown", appVersion: "unknown" }
  }
  const ua = navigator.userAgent
  let platform = "web"
  if (/android/i.test(ua)) platform = "android-web"
  else if (/iphone|ipad|ipod/i.test(ua)) platform = "ios-web"
  else if (/macintosh/i.test(ua)) platform = "macos-web"
  else if (/windows/i.test(ua)) platform = "windows-web"

  let model = "unknown"
  if (/firefox/i.test(ua)) model = "Firefox"
  else if (/edg/i.test(ua)) model = "Edge"
  else if (/chrome/i.test(ua)) model = "Chrome"
  else if (/safari/i.test(ua)) model = "Safari"

  return {
    platform,
    model,
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  }
}

// ── Session check — single source of truth for UI auth state ─────────────────

/**
 * Verify the user's session via GET /api/v1/auth (reads spotix_u_at cookie).
 *
 * USE THIS instead of Firebase onAuthStateChanged to drive isAuthenticated.
 * Firebase Auth is only needed at login time to exchange idToken for our JWT.
 *
 * If the token is expired, attempts one silent refresh before giving up.
 * Returns null for any unauthenticated or error state — never throws.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const check = async (): Promise<SessionUser | null> => {
      const res = await fetch("/api/v1/auth", {
        method: "GET",
        credentials: "same-origin",
      })
      if (!res.ok) return null
      const data = await res.json()
      if (!data.authenticated) return null
      return {
        uid: data.uid,
        email: data.email,
        isBooker: data.isBooker,
        deviceId: data.deviceId,
      }
    }

    const user = await check()
    if (user) return user

    // Token may be expired — silent refresh then one retry
    const refreshed = await tryRefreshTokens()
    if (!refreshed) return null
    return await check()
  } catch {
    return null
  }
}

// ── Token refresh (singleton-locked) ─────────────────────────────────────────

async function _doRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ deviceMeta: collectDeviceMeta() }),
    })
    if (!res.ok) {
      clearAccessToken()
      return false
    }
    const data = await res.json()
    if (data.accessToken) storeAccessToken(data.accessToken)
    return true
  } catch {
    return false
  }
}

/**
 * Silently refresh tokens using the spotix_u_rt httpOnly cookie.
 *
 * Singleton-locked: if a refresh is already in-flight, all concurrent callers
 * await the same promise — only one HTTP request is ever made at a time.
 */
export async function tryRefreshTokens(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise
  _refreshPromise = _doRefresh().finally(() => {
    _refreshPromise = null
  })
  return _refreshPromise
}

// ── Authenticated fetch ───────────────────────────────────────────────────────

/**
 * Drop-in replacement for fetch() on AUTHENTICATED endpoints only.
 *
 * Do NOT call this for public/guest-accessible endpoints — unauthenticated
 * users will be redirected to login.
 *
 * Flow:
 *   1. Proactively refresh if in-memory token is expired or close to expiry
 *   2. Redirect to login if refresh fails
 *   3. Inject Authorization: Bearer <token> header
 *   4. On 401 response, attempt one reactive refresh and retry
 *   5. Redirect to login if reactive refresh also fails
 */
export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  // Step 1 — proactive refresh
  if (isAccessTokenExpired()) {
    const refreshed = await tryRefreshTokens()
    if (!refreshed) {
      redirectToLogin()
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
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
  })

  let response = await fetch(input, buildInit())

  // Step 4 — reactive refresh on 401
  if (response.status === 401) {
    const refreshed = await tryRefreshTokens()
    if (refreshed) {
      response = await fetch(input, buildInit())
    } else {
      clearAccessToken()
      redirectToLogin()
    }
  }

  return response
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function redirectToLogin(): void {
  if (typeof window !== "undefined") {
    window.location.href = `/auth/login?redirect=${encodeURIComponent(
      window.location.pathname
    )}`
  }
}

/**
 * Wipe all event_* entries from sessionStorage.
 * Called on logout so re-login as a different user can't see the
 * previous user's cached likeCount or event data.
 */
function clearEventCache(): void {
  if (typeof window === "undefined") return
  const toRemove: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key?.startsWith("event_")) toRemove.push(key)
  }
  toRemove.forEach((k) => sessionStorage.removeItem(k))
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(redirectTo = "/auth/login"): Promise<void> {
  try {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allDevices: false }),
    })
  } catch {
    // best-effort — always clear local state even if server call fails
  }
  clearAccessToken()
  clearEventCache()
  if (typeof window !== "undefined") window.location.href = redirectTo
}

export async function logoutAllDevices(redirectTo = "/auth/login"): Promise<void> {
  try {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allDevices: true }),
    })
  } catch {
    // best-effort
  }
  clearAccessToken()
  clearEventCache()
  if (typeof window !== "undefined") window.location.href = redirectTo
}