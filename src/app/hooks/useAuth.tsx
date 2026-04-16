/**
 * app/hooks/useAuth.ts
 *
 * React hook — drives auth state across the entire app.
 *
 * ── Usage ─────────────────────────────────────────────────────────────────────
 *
 *   // In your root layout (app/layout.tsx):
 *   import { AuthProvider } from "@/app/hooks/useAuth"
 *   export default function RootLayout({ children }) {
 *     return <AuthProvider>{children}</AuthProvider>
 *   }
 *
 *   // In any component or page:
 *   import { useAuth } from "@/app/hooks/useAuth"
 *   const { user, isLoading, isAuthenticated, logout } = useAuth()
 *
 * ── What this hook does ───────────────────────────────────────────────────────
 *
 *   1. On mount, calls getSessionUser() to verify the current session.
 *      This hits GET /api/v1/auth, which reads the spotix_u_at httpOnly cookie.
 *      If the access token is expired, it silently calls /api/v1/auth/refresh
 *      before giving up. The user never sees a loading spinner for a quiet refresh.
 *
 *   2. Sets up a visibility-change listener. When the tab regains focus after
 *      being in the background, it re-checks the session. This prevents users
 *      from getting 401s after leaving the tab open overnight.
 *
 *   3. Sets up an interval-based silent refresh (every 13 minutes) so the
 *      access token never expires while the user is actively using the app.
 *
 *   4. Exposes logout() and logoutAllDevices() so any component can sign out.
 *
 * ── What this hook does NOT do ────────────────────────────────────────────────
 *
 *   - It does NOT use Firebase onAuthStateChanged. Firebase Auth is only
 *     used at login time to exchange credentials for an ID token.
 *   - It does NOT redirect automatically. Protected pages should use the
 *     withAuth HOC or check `isAuthenticated` themselves.
 *   - It does NOT store the access token in state. The token lives in memory
 *     inside auth-client-user.ts; this hook only exposes user identity.
 */

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  getSessionUser,
  tryRefreshTokens,
  logout         as clientLogout,
  logoutAllDevices as clientLogoutAllDevices,
  type SessionUser,
} from "@/app/lib/auth-client-user";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  /** The authenticated user, or null if not logged in. */
  user:            SessionUser | null;
  /** True while the initial session check is in progress. */
  isLoading:       boolean;
  /** True if user !== null. Convenience shorthand. */
  isAuthenticated: boolean;
  /** Sign out current device and redirect to /auth/login. */
  logout:          (redirectTo?: string) => Promise<void>;
  /** Sign out all devices and redirect to /auth/login. */
  logoutAllDevices:(redirectTo?: string) => Promise<void>;
  /** Force a re-check of the session (e.g. after profile update). */
  refreshSession:  () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

// Interval for proactive silent refresh (13 min — well within 15min AT TTL)
const REFRESH_INTERVAL_MS = 13 * 60 * 1000;

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user,      setUser]      = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Core session check ─────────────────────────────────────────────────────
  const checkSession = useCallback(async () => {
    const sessionUser = await getSessionUser();
    setUser(sessionUser);
    return sessionUser;
  }, []);

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const sessionUser = await getSessionUser();
      if (!cancelled) {
        setUser(sessionUser);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Proactive refresh interval ─────────────────────────────────────────────
  // Keeps the session alive for users who stay on the app for extended periods.
  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      await tryRefreshTokens();
      // Also re-check session to pick up any profile changes
      const sessionUser = await getSessionUser();
      setUser(sessionUser);
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Visibility change — re-check when tab regains focus ───────────────────
  // Prevents 401s after the device wakes from sleep or the tab was backgrounded.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const sessionUser = await getSessionUser();
        setUser(sessionUser);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ── Exposed actions ────────────────────────────────────────────────────────
  const handleLogout = useCallback(async (redirectTo?: string) => {
    setUser(null);
    await clientLogout(redirectTo);
  }, []);

  const handleLogoutAllDevices = useCallback(async (redirectTo?: string) => {
    setUser(null);
    await clientLogoutAllDevices(redirectTo);
  }, []);

  const refreshSession = useCallback(async () => {
    const sessionUser = await checkSession();
    setUser(sessionUser);
  }, [checkSession]);

  // ── Context value ──────────────────────────────────────────────────────────
  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    logout:           handleLogout,
    logoutAllDevices: handleLogoutAllDevices,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

/**
 * useAuth — access auth state from any component.
 *
 * Must be used inside <AuthProvider>. Throws if called outside.
 *
 * @example
 *   const { user, isLoading, isAuthenticated, logout } = useAuth()
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}

// ── withAuth HOC — protect pages ─────────────────────────────────────────────

/**
 * Higher-order component that guards a page behind authentication.
 *
 * While loading: renders a purple full-screen spinner.
 * If not authenticated: redirects to /auth/login?redirect=<currentPath>.
 * If authenticated: renders the wrapped component with the user passed as a prop.
 *
 * @example
 *   export default withAuth(DashboardPage)
 *
 *   // Or with a custom redirect:
 *   export default withAuth(CheckoutPage, "/auth/login")
 */
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P & { user: SessionUser }>,
  loginPath = "/auth/login"
): React.FC<P> {
  const WithAuthComponent: React.FC<P> = (props) => {
    const { user, isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
      if (!isLoading && !isAuthenticated && typeof window !== "undefined") {
        window.location.href = `${loginPath}?redirect=${encodeURIComponent(
          window.location.pathname
        )}`;
      }
    }, [isLoading, isAuthenticated]);

    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#6b2fa5] via-purple-600 to-purple-500 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
        </div>
      );
    }

    if (!isAuthenticated || !user) {
      // Redirect is handled by useEffect above; render nothing while redirecting
      return null;
    }

    return <WrappedComponent {...props} user={user} />;
  };

  WithAuthComponent.displayName = `withAuth(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithAuthComponent;
}
