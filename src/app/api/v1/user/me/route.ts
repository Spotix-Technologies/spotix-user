/**
 * app/api/v1/user/me/route.ts
 *
 * GET /api/v1/user/me
 *
 * Single source of truth for "is this user logged in, and who are they" —
 * used anywhere in the app that needs to (a) check auth and (b) prefill a
 * form with the user's real name/email/phone instead of asking a logged-in
 * user to re-type details we already have (vote modal, ticket payment page,
 * ticket history lookup, etc).
 *
 * This is deliberately separate from GET /api/v1/auth:
 *   - /api/v1/auth        → lightweight JWT claim check only (uid, email,
 *                            isBooker, deviceId) — no Firestore read, used by
 *                            the AuthProvider on every page load.
 *   - /api/v1/user/me     → JWT check + a Firestore read of users/{uid} for
 *                            the fuller profile (fullName, phoneNumber,
 *                            balance) needed to prefill forms.
 *
 * Reads spotix_u_at cookie or Authorization: Bearer header — same as
 * /api/v1/auth. Never returns 401 for "not logged in"; returns
 * { authenticated: false } with 200 so callers can branch without try/catch
 * noise, consistent with the existing session-check convention.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { verifyAccessToken, COOKIE_ACCESS_TOKEN } from "@/app/lib/auth-tokens"

const DEV_TAG = "API developed and maintained by Spotix Technologies"
const AUDIENCE = "spotix-user" as const

function ok<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ...data, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value
    const headerToken  = request.headers.get("Authorization")?.replace("Bearer ", "")
    const token        = cookieToken || headerToken

    if (!token) {
      return ok({ authenticated: false, message: "No access token provided" })
    }

    let payload
    try {
      payload = await verifyAccessToken(token, AUDIENCE)
    } catch (jwtErr: any) {
      return ok({
        authenticated: false,
        message: jwtErr.code === "ERR_JWT_EXPIRED" ? "Access token expired" : "Invalid access token",
      })
    }

    const { uid, email, isBooker, deviceId } = payload

    let profile = {
      username:    "",
      fullName:    "",
      phoneNumber: "",
      balance:     0,
      createdAt:   "",
    }

    try {
      const userDoc = await adminDb.collection("users").doc(uid).get()
      if (userDoc.exists) {
        const d = userDoc.data()!
        profile = {
          username:    d.username    || "",
          fullName:    d.fullName    || "",
          phoneNumber: d.phoneNumber || "",
          balance:     0,
          createdAt:   d.createdAt   || "",
        }
      }
    } catch (err) {
      console.error("[GET /api/v1/user/me] Firestore profile fetch failed (non-fatal):", err)
    }

    try {
      const iwssDoc = await adminDb.collection("IWSS").doc(uid).get()
      if (iwssDoc.exists) profile.balance = iwssDoc.data()?.balance || 0
    } catch {
      // non-fatal
    }

    return ok({
      authenticated: true,
      uid,
      email,
      isBooker,
      deviceId,
      ...profile,
    })
  } catch (error: any) {
    console.error("[GET /api/v1/user/me] error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to fetch user profile", developer: DEV_TAG },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/v1/user/me
 * Body: { phoneNumber: string }
 *
 * Updates the caller's own phoneNumber on users/{uid}. Added so components
 * like AddPhoneNumber (used mid-checkout) don't need direct client Firestore
 * writes, which depend on Firebase client auth state we no longer use as
 * the source of truth.
 */
export async function PATCH(request: NextRequest) {
  try {
    const cookieToken = request.cookies.get(COOKIE_ACCESS_TOKEN)?.value
    const headerToken  = request.headers.get("Authorization")?.replace("Bearer ", "")
    const token        = cookieToken || headerToken

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized", message: "You must be logged in" },
        { status: 401 }
      )
    }

    let payload
    try {
      payload = await verifyAccessToken(token, AUDIENCE)
    } catch {
      return NextResponse.json(
        { error: "Unauthorized", message: "Invalid or expired access token" },
        { status: 401 }
      )
    }

    let body: { phoneNumber?: string }
    try { body = await request.json() }
    catch { return NextResponse.json({ error: "Bad Request", message: "Invalid JSON body" }, { status: 400 }) }

    const { phoneNumber } = body
    if (!phoneNumber?.trim()) {
      return NextResponse.json({ error: "Bad Request", message: "phoneNumber is required" }, { status: 400 })
    }

    await adminDb.collection("users").doc(payload.uid).update({
      phoneNumber: phoneNumber.trim(),
      updatedAt:   new Date().toISOString(),
    })

    return ok({ success: true, phoneNumber: phoneNumber.trim() })
  } catch (error: any) {
    console.error("[PATCH /api/v1/user/me] error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to update profile", developer: DEV_TAG },
      { status: 500 }
    )
  }
}
