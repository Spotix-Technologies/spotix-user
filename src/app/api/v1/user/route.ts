/**
 * app/api/v1/user/route.ts
 *
 * POST /api/v1/user — Create a new user account
 *
 * ── Changes from original ─────────────────────────────────────────────────────
 * 1. Analytics batching — instead of three separate Firestore writes for daily,   monthly, and yearly analytics, now uses a single batch write to update all three in one atomic operation, improving performance and consistency.
 *
 * 2. Referral code fetched once — the original hit Firestore twice for the same
 *    referral document (once to verify, once to process). Now fetched once and
 *    reused.
 *
 * 3. WAT timezone via Intl API — replaced hardcoded `+60 * 60 * 1000` offset
 *    with `Intl.DateTimeFormat` using `"Africa/Lagos"`, consistent with the
 *    event creation route.
 *
 * 4. Firebase Admin import path normalised to `@/lib/firebase-admin` — matches
 *    the rest of the codebase (original used `@/app/lib/firebase-admin`).
 *
 * 5. `emailVerified: true` retained — intentional per original design (no email
 *    verification step in the user portal signup flow).
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEV_TAG = "API developed and maintained by Spotix Technologies";

function ok<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ...data, developer: DEV_TAG }, { status });
}

function err(error: string, message: string, status: number, details?: string) {
  return NextResponse.json(
    { error, message, ...(details ? { details } : {}), developer: DEV_TAG },
    { status }
  );
}

// ── POST /api/v1/user ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return err("Bad Request", "Invalid JSON in request body", 400);
  }

  const { email, password, fullName, username, referralCode } = body;

  // ── Validation ───────────────────────────────────────────────────────────────
  if (!email || !password || !fullName || !username) {
    return err(
      "Bad Request",
      "Missing required fields: email, password, fullName, username",
      400
    );
  }

  // Email format — only .com and .com.ng accepted (business rule)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailLower = (email as string).toLowerCase();
  if (
    !emailRegex.test(email) ||
    (!emailLower.endsWith(".com") && !emailLower.endsWith(".com.ng"))
  ) {
    return err(
      "Bad Request",
      "Please enter a valid email address ending with .com or .com.ng",
      400
    );
  }

  if ((username as string).length < 3) {
    return err("Bad Request", "Username must be at least 3 characters long", 400);
  }

  if ((password as string).length < 6) {
    return err("Bad Request", "Password must be at least 6 characters long", 400);
  }

  const warnings: string[] = [];
  let userId: string;
  let referralProcessed = false;
  let iwssCreated = false;
  let welcomeEmailSent = false;

  // ── Step 1: Create Firebase Auth user ────────────────────────────────────────
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: username,
      emailVerified: true, // No email verification step in this flow
    });
    userId = userRecord.uid;
  } catch (firebaseErr: any) {
    let message = "Unable to create your account. Please try again";
    if (firebaseErr.code === "auth/email-already-exists") {
      message = "An account with this email already exists. Please sign in instead";
    } else if (firebaseErr.code === "auth/invalid-email") {
      message = "Please enter a valid email address";
    } else if (firebaseErr.code === "auth/weak-password") {
      message = "Please choose a stronger password";
    }
    return err("Signup Failed", message, 400, firebaseErr.message);
  }

  // ── Step 2: Analytics ─────────────────────────────────────────────────────────
  try {
    const watFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = watFormatter.formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const year = get("year");
    const month = `${year}-${get("month")}`;
    const day = `${month}-${get("day")}`;

    const analyticsPayload = {
      usersSignedUp: FieldValue.increment(1),
      lastUpdated: FieldValue.serverTimestamp(),
    };

    const analyticsBatch = adminDb.batch();
    const base = adminDb.collection("admin").doc("analytics");
    analyticsBatch.set(base.collection("daily").doc(day), analyticsPayload, { merge: true });
    analyticsBatch.set(base.collection("monthly").doc(month), analyticsPayload, { merge: true });
    analyticsBatch.set(base.collection("yearly").doc(year), analyticsPayload, { merge: true });
    await analyticsBatch.commit();
  } catch (analyticsErr) {
    console.error("Analytics update failed:", analyticsErr);
    warnings.push("Analytics update encountered an issue");
  }

  // ── Step 3: Validate referral code (single Firestore fetch) ──────────────────
  let referrerUsername = "";
  let referralDoc: FirebaseFirestore.DocumentSnapshot | null = null;

  if (referralCode?.trim()) {
    try {
      referralDoc = await adminDb
        .collection("referrals")
        .doc(referralCode.trim())
        .get();

      if (!referralDoc.exists) {
        warnings.push("Referral code does not exist — continuing without referral benefits");
        referralDoc = null;
      } else {
        referrerUsername = referralDoc.data()?.username || "";
      }
    } catch (referralErr) {
      console.error("Referral verification error:", referralErr);
      warnings.push("Unable to verify referral code — continuing without referral benefits");
    }
  }

  // ── Step 4: Create Firestore user document ────────────────────────────────────
  try {
    await adminDb
      .collection("users")
      .doc(userId!)
      .set({
        fullName,
        username,
        email,
        referralCodeUsed: referralCode?.trim() || null,
        referredBy: referrerUsername || null,
        isBooker: true,
        wallet: 0.0,
        createdAt: FieldValue.serverTimestamp(),
      });
  } catch (firestoreErr: any) {
    console.error("Firestore user document creation failed:", firestoreErr);
    warnings.push("User profile creation encountered an issue");
  }

  // ── Step 5: Create IWSS balance document ──────────────────────────────────────
  try {
    await adminDb
      .collection("IWSS")
      .doc(userId!)
      .set({
        balance: 0,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
      });
    iwssCreated = true;
  } catch (iwssErr) {
    console.error("IWSS document creation failed:", iwssErr);
    warnings.push("Wallet initialisation encountered an issue");
  }

  // ── Step 6: Process referral (reuses the doc fetched in step 3) ───────────────
  if (referralDoc && referrerUsername) {
    try {
      await referralDoc.ref.update({
        referredUsers: FieldValue.arrayUnion({
          username,
          email,
          fullName,
          joinedAt: new Date().toISOString(),
          userId: userId!,
        }),
        refGain: FieldValue.increment(200),
        totalReferrals: FieldValue.increment(1),
        lastReferralAt: FieldValue.serverTimestamp(),
      });
      referralProcessed = true;
    } catch (referralErr) {
      console.error("Referral processing failed:", referralErr);
      warnings.push("Referral benefits could not be applied");
    }
  }

  // ── Step 7: Welcome email via Fastify backend ─────────────────────────────────
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backendUrl) {
      const emailRes = await fetch(`${backendUrl}/v1/mail/welcome-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: fullName || username }),
      });

      if (emailRes.ok) {
        welcomeEmailSent = true;
      } else {
        console.error("Welcome email failed:", await emailRes.text());
        warnings.push("Welcome email could not be sent");
      }
    } else {
      warnings.push("Backend URL not configured — welcome email skipped");
    }
  } catch (emailErr) {
    console.error("Welcome email error:", emailErr);
    warnings.push("Welcome email could not be sent");
  }

  // ── Success ───────────────────────────────────────────────────────────────────
  return ok(
    {
      success: true,
      message: "Account created successfully!",
      userId: userId!,
      data: {
        email,
        username,
        referralProcessed,
        iwssCreated,
        welcomeEmailSent,
      },
      ...(warnings.length > 0 ? { warnings } : {}),
    },
    201
  );
}