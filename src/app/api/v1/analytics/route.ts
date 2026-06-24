import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Analytics API Route
 * POST: Update global platform analytics (daily, monthly, yearly) — idempotent
 * GET: Friendly message
 */

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: "You're not meant to be here but welcome to the analytics API",
      hint: "This endpoint accepts POST requests to update analytics data",
      developer: "API developed and maintained by Spotix Technologies",
    },
    { status: 200 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ticketId is used as idempotency key (first ticketId of the batch, passed from ticket.js)
    // ticketCount is the total number of tickets in this order (defaults to 1 for backwards compat)
    // ticketPrice is the total order value (totalAmount from the reference)
    // transactionFee is the VAT/transaction fee amount
    const { ticketPrice, ticketId, ticketCount, transactionFee, eventId, timestamp } = body;

    // ── Validation ────────────────────────────────────────────────
    // Use explicit undefined/null check — ticketPrice of 0 is valid (free tickets)
    if (ticketPrice === undefined || ticketPrice === null || !ticketId) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Missing required fields: ticketPrice, ticketId",
          developer: "API developed and maintained by Spotix Technologies",
        },
        { status: 400 }
      );
    }

    const totalRevenue = Number(ticketPrice);
    if (isNaN(totalRevenue) || totalRevenue < 0) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Invalid ticket price. Must be a non-negative number.",
          developer: "API developed and maintained by Spotix Technologies",
        },
        { status: 400 }
      );
    }

    // How many seats were sold in this order — default to 1 for backwards compatibility
    const qty = Math.max(1, Number(ticketCount) || 1);

    // ── Nigerian time (WAT = UTC+1) ───────────────────────────────
    const now = timestamp ? new Date(timestamp) : new Date();
    const nigerianTime = new Date(now.getTime() + 60 * 60 * 1000);

    const year  = nigerianTime.getUTCFullYear().toString();
    const month = `${nigerianTime.getUTCFullYear()}-${String(nigerianTime.getUTCMonth() + 1).padStart(2, "0")}`;
    const day   = `${year}-${String(nigerianTime.getUTCMonth() + 1).padStart(2, "0")}-${String(nigerianTime.getUTCDate()).padStart(2, "0")}`;

    // ── Idempotency check ─────────────────────────────────────────
    // ticketId here is the first ticket of the batch — unique per order call from ticket.js
    const processedRef = adminDb
      .collection("admin")
      .doc("analytics")
      .collection("processedTicketSales")
      .doc(ticketId);

    const processedSnap = await processedRef.get();

    if (processedSnap.exists) {
      console.log(`[Analytics] Already processed ticketId: ${ticketId}`);
      return NextResponse.json(
        {
          success: true,
          message: "Analytics already updated for this ticket (idempotent)",
          ticketId,
          alreadyProcessed: true,
          day,
          month,
          year,
        },
        { status: 200 }
      );
    }

    // ── Analytics update — increment by real order quantities ─────
    const updateData = {
      ticketsSold: FieldValue.increment(qty),
      totalRevenue: FieldValue.increment(totalRevenue),
      totalTransactionFees: FieldValue.increment(Number(transactionFee) || 0),
      lastUpdated: FieldValue.serverTimestamp(),
    };

    const batch = adminDb.batch();

    const dailyRef   = adminDb.collection("admin").doc("analytics").collection("daily").doc(day);
    const monthlyRef = adminDb.collection("admin").doc("analytics").collection("monthly").doc(month);
    const yearlyRef  = adminDb.collection("admin").doc("analytics").collection("yearly").doc(year);

    batch.set(dailyRef,   updateData, { merge: true });
    batch.set(monthlyRef, updateData, { merge: true });
    batch.set(yearlyRef,  updateData, { merge: true });

    await batch.commit();

    // Mark as processed after successful commit (at-least-once + deduplication)
    await processedRef.set({
      processedAt: FieldValue.serverTimestamp(),
      ticketPrice: totalRevenue,
      ticketCount: qty,
      transactionFee: Number(transactionFee) || 0,
      eventId: eventId || null,
      day,
      month,
      year,
      createdAt: now.toISOString(),
      nigerianTime: nigerianTime.toISOString(),
    });

    console.log(`[Analytics] Updated — ticketId: ${ticketId}, qty: ${qty}, revenue: ${totalRevenue}`);

    return NextResponse.json(
      {
        success: true,
        message: "Analytics updated successfully",
        data: {
          ticketId,
          ticketCount: qty,
          ticketPrice: totalRevenue,
          transactionFee: Number(transactionFee) || 0,
          day,
          month,
          year,
          nigerianTime: nigerianTime.toISOString(),
        },
        developer: "API developed and maintained by Spotix Technologies",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Analytics] Error:", error);

    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to update analytics",
        details: error instanceof Error ? error.message : "Unknown error",
        developer: "API developed and maintained by Spotix Technologies",
      },
      { status: 500 }
    );
  }
}