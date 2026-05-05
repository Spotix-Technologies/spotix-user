/**
 * app/api/v1/ticket/route.ts
 *
 * GET /api/v1/ticket  — Fetch all tickets for the authenticated user
 *
 * This route fetches all tickets matching the currently logged-in user's email
 * from the tickets collection in Firestore (tickets/[ticketId]).
 *
 * Authentication:
 *   - Reads spotix_u_at cookie or Authorization: Bearer header
 *   - Verifies JWT token to extract user email
 *
 * Response:
 *   - tickets: Array of ticket objects with all details
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/app/lib/auth-tokens";
import { adminDb } from "@/app/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIENCE = "spotix-user" as const;
const DEV_TAG = "API developed and maintained by Spotix Technologies";

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

// ── GET /api/v1/ticket ─────────────────────────────────────────────────────────
/**
 * Fetch all tickets matching the authenticated user's email.
 *
 * Query Parameters:
 *   - None (email is extracted from JWT)
 *
 * Response:
 *   {
 *     success: boolean,
 *     tickets: Array<{
 *       id: string,
 *       email: string,
 *       eventId: string,
 *       eventName: string,
 *       ticketType: string,
 *       ticketPrice: number,
 *       ticketReference: string,
 *       purchaseDate: string,
 *       purchaseTime: string,
 *       paymentMethod: string,
 *       ...other fields
 *     }>
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Extract and verify JWT token
    const cookieToken = request.cookies.get("spotix_u_at")?.value;
    const headerToken = request.headers.get("Authorization")?.replace("Bearer ", "");
    const token = cookieToken || headerToken;

    if (!token) {
      return err("Unauthorized", "No access token provided", 401);
    }

    let payload;
    try {
      payload = await verifyAccessToken(token, AUDIENCE);
    } catch (jwtErr: any) {
      return err(
        "Unauthorized",
        jwtErr.code === "ERR_JWT_EXPIRED"
          ? "Access token has expired"
          : "Invalid access token",
        401
      );
    }

    const userEmail = payload.email;
    if (!userEmail) {
      return err("Unauthorized", "User email not found in token", 401);
    }

    // 2. Query tickets collection for all tickets matching the user's email
    try {
      const ticketsRef = adminDb.collection("tickets");
      const query = ticketsRef.where("email", "==", userEmail);
      const snapshot = await query.get();

      const tickets: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Format purchase date/time if they exist
        let purchaseDate = "N/A";
        let purchaseTime = "N/A";

        if (data.purchaseDate) {
          if (typeof data.purchaseDate === "string") {
            purchaseDate = data.purchaseDate;
            purchaseTime = data.purchaseTime || "N/A";
          } else if (data.purchaseDate.toDate) {
            const date = data.purchaseDate.toDate();
            purchaseDate = date.toLocaleDateString();
            purchaseTime = date.toLocaleTimeString();
          }
        }

        tickets.push({
          id: doc.id,
          email: data.email || "",
          eventId: data.eventId || "",
          eventName: data.eventName || "Unknown Event",
          eventType: data.eventType || "Unknown",
          ticketType: data.ticketType || "Standard",
          ticketPrice: data.ticketPrice || 0,
          ticketId: data.ticketId || "",
          ticketReference: data.ticketReference || "",
          purchaseDate: purchaseDate,
          purchaseTime: purchaseTime,
          paymentMethod: data.paymentMethod || "Wallet",
          eventCreatorId: data.eventCreatorId || "",
          eventDate: data.eventDate || "",
          eventEndDate: data.eventEndDate || "",
          eventStart: data.eventStart || "",
          eventEnd: data.eventEnd || "",
          eventVenue: data.eventVenue || "",
          stopDate: data.stopDate || "",
          hasEmbedding: data.hasEmbedding === true,
        });
      });

      // Sort by purchase date descending
      tickets.sort((a, b) => {
        const dateA = new Date(a.purchaseDate).getTime();
        const dateB = new Date(b.purchaseDate).getTime();
        return dateB - dateA;
      });

      return ok({
        success: true,
        message: `Found ${tickets.length} ticket(s)`,
        tickets,
      });
    } catch (firestoreErr: any) {
      console.error("[ticket] Firestore query error:", firestoreErr);
      return err(
        "Database Error",
        "Failed to fetch tickets",
        500,
        firestoreErr.message
      );
    }
  } catch (error: any) {
    console.error("[ticket] Unexpected error:", error);
    return err("Internal Server Error", "An unexpected error occurred", 500, error.message);
  }
}
