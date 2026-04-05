/**
 * lib/auth-edge.ts
 *
 * Edge-runtime-safe JWT verification.
 *
 * WHY THIS FILE EXISTS:
 * Next.js middleware runs on the Edge runtime, which does NOT have access to
 * Node.js APIs (no `crypto` module, no `bcryptjs`, no Firebase Admin SDK).
 * The main `auth-tokens.ts` uses `jose` + Node crypto — fine for API routes,
 * but it cannot be imported in middleware.
 *
 * This file reimplements ONLY what middleware needs:
 *   - Verify a HS256 JWT using the Web Crypto API (available everywhere)
 *   - Return typed payload or null (never throws into middleware)
 *
 * It shares the same SECRET and the same token shape as auth-tokens.ts,
 * so tokens issued by the API routes are transparently readable here.
 *
 * AUDIENCE ENFORCEMENT:
 * Both portals share the same secret, so we must enforce the audience claim
 * in middleware to prevent a user portal token from being accepted by the
 * booker middleware and vice versa. Each middleware passes its own expected
 * audience to verifyAccessTokenEdge().
 */

export interface EdgeTokenPayload {
  uid: string;
  email: string;
  isBooker: boolean;
  deviceId: string;
  exp: number;
  iat: number;
}

export type EdgeAudience = "spotix-booker" | "spotix-user";

// ── Internal helpers ───────────────────────────────────────────────────────────

function base64UrlDecode(str: string): Uint8Array<ArrayBuffer> {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  return new Uint8Array(
    Array.from(binary, (c) => c.charCodeAt(0))
  ) as Uint8Array<ArrayBuffer>;
}

async function importSecret(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Verify a HS256 JWT entirely in the Edge runtime.
 *
 * @param token    - Raw JWT string from the spotix_at cookie
 * @param audience - Expected audience: "spotix-booker" or "spotix-user"
 *
 * Returns the typed payload on success.
 * Returns null if the token is missing, malformed, expired, wrong audience,
 * or has a bad signature. Never throws.
 */
export async function verifyAccessTokenEdge(
  token: string | undefined,
  audience: EdgeAudience
): Promise<EdgeTokenPayload | null> {
  if (!token) return null;

  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    console.error("[auth-edge] ACCESS_TOKEN_SECRET env var is not set");
    return null;
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // 1. Verify signature
    const key = await importSecret(secret);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);

    const valid = await crypto.subtle.verify("HMAC", key, signature, data);
    if (!valid) return null;

    // 2. Decode and parse payload
    const payloadBytes = base64UrlDecode(payloadB64);
    const payloadJson = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadJson) as EdgeTokenPayload & {
      iss?: string;
      aud?: string;
    };

    // 3. Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    // 4. Enforce issuer
    if (payload.iss !== "spotix") return null;

    // 5. Enforce audience — prevents cross-portal token acceptance
    if (payload.aud !== audience) return null;

    return payload;
  } catch {
    return null;
  }
}