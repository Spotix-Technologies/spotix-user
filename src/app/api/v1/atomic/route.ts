import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Atomic Operations API Route
 * Handles event statistics updates atomically
 * POST /api/v1/atomic-operations
 */

interface AtomicOperationsRequest {
  creatorId: string;
  eventId: string;
  ticketType: string;
  ticketPrice: number;
  quantity?: number;           // number of seats purchased for this ticket type
  discountCode?: string | null;
  ticketId: string;            // used as idempotency key (first ticketId of the batch)
}

interface TicketPrice {
  policy: string;
  price: number;
  ticketsSold?: number;
  availableTickets: number | null | undefined;
  [key: string]: any;
}

interface OperationsPerformed {
  ticketsSoldIncremented: boolean;
  revenueUpdated: boolean;
  availableTicketsDecremented: boolean;
  discountUpdated: boolean;
  organizerStatsUpdated: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: AtomicOperationsRequest = await req.json();
    const { creatorId, eventId, ticketType, ticketPrice, quantity, discountCode, ticketId } = body;

    // Validate required fields
    if (!creatorId || !eventId || !ticketType || ticketPrice === undefined || !ticketId) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Missing required fields: creatorId, eventId, ticketType, ticketPrice, ticketId",
        },
        { status: 400 }
      );
    }

    // Quantity defaults to 1 for backwards compatibility
    const qty = Math.max(1, Number(quantity) || 1);

    console.log(`[Atomic Ops] Processing ticketId: ${ticketId}, eventId: ${eventId}, type: ${ticketType}, qty: ${qty}`);

    // ── Flat event document: events/{eventId} ─────────────────────────────────
    const eventDocRef = adminDb.collection("events").doc(eventId);

    // ── Organizer user document: users/{creatorId} ────────────────────────────
    const organizerDocRef = adminDb.collection("users").doc(creatorId);

    // ── Idempotency check — also flat ─────────────────────────────────────────
    const processedRef = eventDocRef.collection("_processedTickets").doc(ticketId);
    const processedDoc = await processedRef.get();

    if (processedDoc.exists) {
      console.log(`[Atomic Ops] Ticket ${ticketId} already processed — skipping`);
      return NextResponse.json(
        {
          success: true,
          message: "Operation already processed (idempotent)",
          ticketId,
          alreadyProcessed: true,
        },
        { status: 200 }
      );
    }

    const operationsPerformed: OperationsPerformed = {
      ticketsSoldIncremented: false,
      revenueUpdated: false,
      availableTicketsDecremented: false,
      discountUpdated: false,
      organizerStatsUpdated: false,
    };

    await adminDb.runTransaction(async (transaction) => {
      const eventDoc = await transaction.get(eventDocRef);
      const organizerDoc = await transaction.get(organizerDocRef);

      if (!eventDoc.exists) {
        throw new Error(`Event not found: ${eventId}`);
      }

      const eventData = eventDoc.data();
      const ticketPrices: TicketPrice[] = eventData?.ticketPrices || [];

      // Update the matching ticket type entry inside the ticketPrices array:
      //   - increment ticketsSold by qty
      //   - decrement availableTickets by qty (if finite)
      const updatedTicketPrices = ticketPrices.map((ticket) => {
        if (ticket.policy !== ticketType) return ticket;

        const currentSold = Number(ticket.ticketsSold) || 0;
        const updated: TicketPrice = {
          ...ticket,
          ticketsSold: currentSold + qty,
        };

        if (
          ticket.availableTickets !== null &&
          ticket.availableTickets !== undefined
        ) {
          const remaining = ticket.availableTickets - qty;
          if (remaining < 0) {
            console.warn(`[Atomic Ops] availableTickets for ${ticketType} would go below 0 — clamping to 0`);
          }
          updated.availableTickets = Math.max(0, remaining);
          operationsPerformed.availableTicketsDecremented = true;
        } else {
          // Unlimited — no decrement needed
          console.log(`[Atomic Ops] Ticket type ${ticketType} has unlimited availability`);
        }

        return updated;
      });

      // Top-level event stats — increment by qty / qty * price
      transaction.update(eventDocRef, {
        ticketsSold: FieldValue.increment(qty),
        totalRevenue: FieldValue.increment(Number(ticketPrice) * qty),
        ticketPrices: updatedTicketPrices,
      });

      operationsPerformed.ticketsSoldIncremented = true;
      operationsPerformed.revenueUpdated = true;

      // Organizer stats — users/{creatorId}
      if (organizerDoc.exists) {
        transaction.update(organizerDocRef, {
          totalTicketsSold: FieldValue.increment(qty),
          totalRevenue: FieldValue.increment(Number(ticketPrice) * qty),
        });
        operationsPerformed.organizerStatsUpdated = true;
        console.log(`[Atomic Ops] Organizer ${creatorId} stats updated — qty: ${qty}, revenue: +${Number(ticketPrice) * qty}`);
      } else {
        console.warn(`[Atomic Ops] Organizer doc not found for creatorId: ${creatorId} — skipping user stats update`);
      }

      // Mark processed to prevent duplicate runs
      transaction.set(processedRef, {
        ticketId,
        ticketType,
        ticketPrice: Number(ticketPrice),
        quantity: qty,
        processedAt: FieldValue.serverTimestamp(),
        createdAt: new Date().toISOString(),
      });

      console.log(`[Atomic Ops] Transaction complete — ticketId: ${ticketId}, qty: ${qty}`);
    });

    // ── Discount usage — flat path: events/{eventId}/discounts/{code} ─────────
    if (discountCode) {
      try {
        const discountDocRef = adminDb
          .collection("events")
          .doc(eventId)
          .collection("discounts")
          .doc(discountCode);

        const discountDoc = await discountDocRef.get();

        if (discountDoc.exists) {
          await discountDocRef.update({
            usedCount: FieldValue.increment(qty),
          });
          operationsPerformed.discountUpdated = true;
          console.log(`[Atomic Ops] Discount ${discountCode} usedCount incremented by ${qty}`);
        }
      } catch (discountError) {
        console.error(`[Atomic Ops] Error updating discount (non-blocking):`, discountError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Atomic operations completed successfully",
        ticketId,
        eventId,
        quantity: qty,
        operationsPerformed,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Atomic Ops] Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to perform atomic operations",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      service: "Atomic Operations API",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
} 