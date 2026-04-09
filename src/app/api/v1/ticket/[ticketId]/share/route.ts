/**
 * app/api/v1/ticket/[ticketId]/share/route.ts
 *
 * POST /api/v1/ticket/[ticketId]/share  — Gift a ticket to another user
 *
 * Authentication:
 *   - Reads spotix_u_at cookie or Authorization: Bearer header
 *   - Verifies JWT token to extract gifter's email
 *
 * Body:
 *   {
 *     gifteeEmail: string
 *     gifteeName: string
 *     gifteePhone: string
 *     giftNote?: string
 *     giftReason: string
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/app/lib/auth-tokens";
import { adminDb } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIENCE = "spotix-user" as const;
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

function generateTicketId(): string {
  const randomNumbers = Math.floor(10000000 + Math.random() * 90000000).toString();
  const randomLetters = Math.random().toString(36).substring(2, 4).toUpperCase();
  const pos1 = Math.floor(Math.random() * 8);
  const pos2 = Math.floor(Math.random() * 7) + pos1 + 1;
  const part1 = randomNumbers.substring(0, pos1);
  const part2 = randomNumbers.substring(pos1, pos2);
  const part3 = randomNumbers.substring(pos2);
  return `SPTX-TX-${part1}${randomLetters[0]}${part2}${randomLetters[1]}${part3}`;
}

// ── GET — Check if giftee email exists in Spotix ───────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    await params; // ticketId not needed for this lookup

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return err("Bad Request", "Email is required", 400);
    }

    // Verify the caller is authenticated
    const cookieToken = request.cookies.get("spotix_u_at")?.value;
    const headerToken = request.headers.get("Authorization")?.replace("Bearer ", "");
    const token = cookieToken || headerToken;
    if (!token) return err("Unauthorized", "No access token provided", 401);

    try {
      await verifyAccessToken(token, AUDIENCE);
    } catch (jwtErr: any) {
      return err(
        "Unauthorized",
        jwtErr.code === "ERR_JWT_EXPIRED" ? "Access token has expired" : "Invalid access token",
        401
      );
    }

    // Search users collection for matching email
    const usersSnap = await adminDb
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (usersSnap.empty) {
      return ok({ found: false });
    }

    const userData = usersSnap.docs[0].data();

    return ok({
      found: true,
      fullName: userData.fullName || userData.username || "",
      phoneNumber: userData.phoneNumber || "",
    });
  } catch (error: any) {
    console.error("[ticket-share] GET error:", error);
    return err("Internal Server Error", "An unexpected error occurred", 500, error.message);
  }
}

// ── POST — Execute the gift ────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;

    if (!ticketId) return err("Bad Request", "Ticket ID is required", 400);

    // 1. Auth
    const cookieToken = request.cookies.get("spotix_u_at")?.value;
    const headerToken = request.headers.get("Authorization")?.replace("Bearer ", "");
    const token = cookieToken || headerToken;
    if (!token) return err("Unauthorized", "No access token provided", 401);

    let payload: any;
    try {
      payload = await verifyAccessToken(token, AUDIENCE);
    } catch (jwtErr: any) {
      return err(
        "Unauthorized",
        jwtErr.code === "ERR_JWT_EXPIRED" ? "Access token has expired" : "Invalid access token",
        401
      );
    }

    const gifterEmail = payload.email;
    if (!gifterEmail) return err("Unauthorized", "User email not found in token", 401);

    // 2. Parse body
    const body = await request.json();
    const { gifteeEmail, gifteeName, gifteePhone, giftNote, giftReason } = body;

    if (!gifteeEmail || !gifteeName || !gifteePhone || !giftReason) {
      return err("Bad Request", "gifteeEmail, gifteeName, gifteePhone, and giftReason are required", 400);
    }

    if (gifteeEmail === gifterEmail) {
      return err("Bad Request", "You cannot gift a ticket to yourself", 400);
    }

    // 3. Fetch original ticket
    const ticketRef = adminDb.collection("tickets").doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) return err("Not Found", "Ticket not found", 404);

    const ticketData = ticketDoc.data()!;

    // Verify ownership
    if (ticketData.email !== gifterEmail) {
      return err("Forbidden", "You do not own this ticket", 403);
    }

    // Prevent re-gifting
    if (ticketData.giftedBy) {
      return err("Conflict", "This ticket has already been gifted", 409);
    }

    // 4. Fetch gifter's name from users collection
    const gifterUsersSnap = await adminDb
      .collection("users")
      .where("email", "==", gifterEmail)
      .limit(1)
      .get();

    const gifterName = gifterUsersSnap.empty
      ? gifterEmail
      : gifterUsersSnap.docs[0].data().fullName ||
        gifterUsersSnap.docs[0].data().username ||
        gifterEmail;

    // 5. Build new ticket data — replace personal fields, strip face embedding
    const {
      email: _email,
      fullName: _fullName,
      phoneNumber: _phone,
      faceEmbedding: _face,
      faceEmbeddings: _faces,
      ...restTicketData
    } = ticketData;

    const newTicketId = generateTicketId();
    const newTicketData = {
      ...restTicketData,
      email: gifteeEmail,
      fullName: gifteeName,
      phoneNumber: gifteePhone,
      giftedBy: gifterEmail,
      gifterName: gifterName,
      giftNote: giftNote || "",
      giftReason: giftReason,
      giftedAt: FieldValue.serverTimestamp(),
      ticketId: newTicketId,
    };

    // 6. Run as Firestore batch
    const batch = adminDb.batch();

    // Create new ticket doc
    const newTicketRef = adminDb.collection("tickets").doc(newTicketId);
    batch.set(newTicketRef, newTicketData);

    // Delete old ticket doc
    batch.delete(ticketRef);

    // Update attendees subcollection under event if eventId exists
    const eventId = ticketData.eventId;
    if (eventId) {
      const oldAttendeeRef = adminDb
        .collection("events")
        .doc(eventId)
        .collection("attendees")
        .doc(ticketId);

      const newAttendeeRef = adminDb
        .collection("events")
        .doc(eventId)
        .collection("attendees")
        .doc(newTicketId);

      // Fetch old attendee doc to carry data over
      const oldAttendeeDoc = await oldAttendeeRef.get();
      const attendeeData = oldAttendeeDoc.exists ? oldAttendeeDoc.data() : {};

      batch.delete(oldAttendeeRef);
      batch.set(newAttendeeRef, {
        ...attendeeData,
        email: gifteeEmail,
        fullName: gifteeName,
        phoneNumber: gifteePhone,
        ticketId: newTicketId,
        giftedBy: gifterEmail,
      });
    }

    await batch.commit();

    return ok({
      success: true,
      message: "Ticket gifted successfully",
      newTicketId,
    });
  } catch (error: any) {
    console.error("[ticket-share] POST error:", error);
    return err("Internal Server Error", "An unexpected error occurred", 500, error.message);
  }
}