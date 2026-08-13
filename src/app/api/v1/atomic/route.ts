import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/app/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { invalidateEventCache } from "@/app/lib/eventCache";

/**
 * Atomic Operations API Route
 * Handles event statistics updates atomically
 * POST /api/v1/atomic
 *
 * Strictly deducts `quantity` from the matching ticketPrices[].availableTickets
 * (when set) and adds `quantity` to ticketPrices[].ticketsSold, plus the
 * top-level event ticketsSold — all in one atomic transaction, hence the name "atomic".
 */

interface AtomicOperationsRequest {
  creatorId: string;
  eventId: string;
  ticketType: string;          // must match ticketPrices[].policy exactly
  ticketPrice: number;
  quantity?: number;           // seats purchased for this ticket type
  discountCode?: string | null;
  ticketId: string;            // idempotency key (first ticketId of the batch)
}

interface TicketPriceEntry {
  policy: string;
  price: number;
  ticketsSold?: number;
  availableTickets?: number | null;
  [key: string]: any;
}

interface OperationsPerformed {
  ticketsSoldIncremented: boolean;
  revenueUpdated: boolean;
  availableTicketsDecremented: boolean;
  discountUpdated: boolean;
  organizerStatsUpdated: boolean;
  oversold: boolean;
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

    // qty is exactly what the user purchased of minimum 1
    const qty = Math.max(1, Number(quantity) || 1);

    console.log(`[Atomic] ticketId=${ticketId} | event=${eventId} | type="${ticketType}" | qty=${qty}`);

    const eventDocRef     = adminDb.collection("events").doc(eventId);
    const organizerDocRef = adminDb.collection("users").doc(creatorId);

    // Idempotency guard (outside transaction — cheap read) 
    const processedRef = eventDocRef.collection("_processedTickets").doc(ticketId);
    const processedDoc = await processedRef.get();

    if (processedDoc.exists) {
      console.log(`[Atomic] ${ticketId} already processed — skipping`);
      return NextResponse.json(
        { success: true, message: "Already processed (idempotent)", ticketId, alreadyProcessed: true },
        { status: 200 }
      );
    }

    const operationsPerformed: OperationsPerformed = {
      ticketsSoldIncremented: false,
      revenueUpdated: false,
      availableTicketsDecremented: false,
      discountUpdated: false,
      organizerStatsUpdated: false,
      oversold: false,
    };

    // Single Firestore transaction 
    await adminDb.runTransaction(async (tx) => {
      const eventDoc     = await tx.get(eventDocRef);
      const organizerDoc = await tx.get(organizerDocRef);

      if (!eventDoc.exists) {
        throw Object.assign(new Error(`Event not found: ${eventId}`), { statusCode: 404 });
      }

      const eventData = eventDoc.data()!;
      const ticketPrices: TicketPriceEntry[] = Array.isArray(eventData.ticketPrices)
        ? eventData.ticketPrices
        : [];

      // Find the matching tier 
      const tierIndex = ticketPrices.findIndex((t) => t.policy === ticketType);

      if (tierIndex === -1) {
        // Type not found in ticketPrices — log and continue without array update
        // (event may not have typed tiers; top-level count still increments)
        console.warn(`[Atomic] Ticket type "${ticketType}" not found in ticketPrices — skipping tier update`);
      }

      // Build the updated ticketPrices array 
      let availableTicketsDecremented = false;
      const updatedTicketPrices = ticketPrices.map((tier, i) => {
        if (i !== tierIndex) return tier; // leave every other tier untouched

        // ticketsSold: treat missing/undefined as 0
        const currentSold = Number(tier.ticketsSold) || 0;

        // availableTickets only represents a real limit when it's a genuine,
        // finite, non-negative number. Missing, null, an empty string, or any
        // other malformed value means the organizer wants no limit — mirrors
        // getRemaining() in buy-ticket-dialog.tsx exactly, so the frontend's
        // "unlimited" display and this backend guard never disagree.
        const parsedAvailable = Number(tier.availableTickets);
        const hasLimit =
          tier.availableTickets !== null &&
          tier.availableTickets !== undefined &&
          (tier.availableTickets as unknown as string) !== "" &&
          Number.isFinite(parsedAvailable);

        if (hasLimit) {
          const currentAvailable = parsedAvailable;

          // The ticket + attendee docs are already written by the time this
          // step runs, and the buyer has already been charged by Paystack —
          // this call exists to keep stock/revenue bookkeeping in sync, not
          // to gate the sale. So we never abort the transaction here: an
          // aborted transaction means a real, paid, already-issued ticket
          // silently never counts toward totalRevenue/ticketsSold/organizer
          // stats. Instead, clamp availableTickets at 0 and just log the
          // oversell for visibility (stale frontend cache, race between
          // concurrent buyers, etc. are the usual causes).
          if (currentAvailable < qty) {
            operationsPerformed.oversold = true;
            console.warn(
              `[Atomic] Oversell on "${ticketType}": ${currentAvailable} available, ${qty} requested — recording sale anyway, clamping availableTickets to 0`
            );
          }

          availableTicketsDecremented = true;
          return {
            ...tier,
            ticketsSold: currentSold + qty,                          // +qty to this tier's sold count
            availableTickets: Math.max(0, currentAvailable - qty),   // never go below 0
          };
        }

        // No limit set — only increment ticketsSold
        return {
          ...tier,
          ticketsSold: currentSold + qty,
        };
      });

      operationsPerformed.availableTicketsDecremented = availableTicketsDecremented;

      // Write event document 
      // ticketsSold (top-level) uses FieldValue.increment so concurrent
      // transactions don't race on that scalar field.
      // ticketPrices array is written back in full (Firestore has no
      // per-element array increment — this is the correct pattern).
      tx.update(eventDocRef, {
        ticketsSold:  FieldValue.increment(qty),
        totalRevenue: FieldValue.increment(Number(ticketPrice) * qty),
        ...(tierIndex !== -1 ? { ticketPrices: updatedTicketPrices } : {}),
      });

      operationsPerformed.ticketsSoldIncremented = true;
      operationsPerformed.revenueUpdated         = true;

      // Write organizer document 
      if (organizerDoc.exists) {
        tx.update(organizerDocRef, {
          totalTicketsSold: FieldValue.increment(qty),
          totalRevenue:     FieldValue.increment(Number(ticketPrice) * qty),
        });
        operationsPerformed.organizerStatsUpdated = true;
      } else {
        console.warn(`[Atomic] Organizer doc not found for ${creatorId} — skipping user stats`);
      }

      // Mark processed (idempotency record) 
      tx.set(processedRef, {
        ticketId,
        ticketType,
        ticketPrice:  Number(ticketPrice),
        quantity:     qty,
        processedAt:  FieldValue.serverTimestamp(),
        createdAt:    new Date().toISOString(),
      });

      console.log(`[Atomic] Transaction committed — type="${ticketType}", qty=${qty}, availDecremented=${availableTicketsDecremented}`);
    });

    // Bust the cached event doc so availableTickets/ticketsSold don't stay
    // stale for the rest of the cache TTL after a real purchase. Non-blocking
    // — a failure here just means the next read waits out the TTL as before.
    invalidateEventCache(eventId).catch((err) =>
      console.error(`[Atomic] Cache invalidation failed for event ${eventId}:`, err)
    );

    // Discount usage (non-blocking, outside transaction) 
    if (discountCode) {
      try {
        const discountDocRef = adminDb
          .collection("events")
          .doc(eventId)
          .collection("discounts")
          .doc(discountCode);

        const discountDoc = await discountDocRef.get();
        if (discountDoc.exists) {
          await discountDocRef.update({ usedCount: FieldValue.increment(qty) });
          operationsPerformed.discountUpdated = true;
          console.log(`[Atomic] Discount "${discountCode}" usedCount +${qty}`);
        }
      } catch (discountError) {
        console.error("[Atomic] Discount update error (non-blocking):", discountError);
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
    console.error("[Atomic] Error:", error);
    const statusCode = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      {
        error: statusCode === 409 ? "Conflict" : statusCode === 404 ? "Not Found" : "Internal Server Error",
        message: error instanceof Error ? error.message : "Failed to perform atomic operations",
      },
      { status: statusCode }
    );
  }
}

// export async function GET() {
//   return NextResponse.json(
//     { status: "healthy", service: "Atomic Operations API", timestamp: new Date().toISOString() },
//     { status: 200 }
//   );
// }