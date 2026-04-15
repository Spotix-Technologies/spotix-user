// Ticket Generation Route
// Handles ticket creation after payment verification
// Supports multi-ticket purchases and guest checkout
// v1/ticket.js

import { adminDb } from "./firebase-admin.js";
import { FieldValue } from "firebase-admin/firestore";

export default async function ticketRoute(fastify, options) {
  fastify.post("/ticket", async (request, reply) => {
    try {
      const { reference } = request.body;

      if (!reference) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Missing required parameter: reference",
          developer: "API developed and maintained by Spotix Technologies",
        });
      }

      if (!reference.startsWith("SPTX-REF-")) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Invalid reference format. Expected format: SPTX-REF-{timestamp}",
          developer: "API developed and maintained by Spotix Technologies",
        });
      }

      // ─── Step 1: Verify payment status with retry logic ───────────────────────
      let paymentData = null;
      let attempts = 0;
      const maxAttempts = 3;
      const referenceDocRef = adminDb.collection("Reference").doc(reference);

      while (attempts < maxAttempts) {
        const referenceDoc = await referenceDocRef.get();

        if (!referenceDoc.exists) {
          return reply.code(404).send({
            error: "Not Found",
            message: "Payment reference not found",
            reference,
            developer: "API developed and maintained by Spotix Technologies",
          });
        }

        paymentData = referenceDoc.data();

        if (paymentData.status === "successful") {
          break;
        } else if (paymentData.status === "failed") {
          return reply.code(400).send({
            error: "Payment Failed",
            message: "Payment verification failed. Please try again or contact support.",
            reference,
            developer: "API developed and maintained by Spotix Technologies",
          });
        } else if (paymentData.status === "pending") {
          attempts++;
          if (attempts < maxAttempts) {
            fastify.log.info(`[step:1] Payment pending, retrying (${attempts}/${maxAttempts})`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } else {
            return reply.code(400).send({
              error: "Payment Pending",
              message: "Payment is still being processed. Please try again in a few moments.",
              reference,
              developer: "API developed and maintained by Spotix Technologies",
            });
          }
        }
      }

      const now = new Date();
      const purchaseDate = now.toLocaleDateString();
      const purchaseTime = now.toLocaleTimeString();
      const nowIso = now.toISOString();

      // ─── Resolve buyer identity ────────────────────────────────────────────────
      const isGuest = !paymentData.userId;
      const effectiveUid = paymentData.userId || paymentData.guestEmail || paymentData.userEmail;

      if (!effectiveUid) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Cannot resolve buyer identity: no userId or guest email on reference.",
          developer: "API developed and maintained by Spotix Technologies",
        });
      }

      const buyerFullName = paymentData.userFullName || "Valued Customer";
      const buyerEmail = paymentData.userEmail || paymentData.guestEmail || "";
      const buyerPhone = paymentData.userPhone || paymentData.guestPhone || "";

      // ─── Step 2: Build the list of tickets to generate ────────────────────────
      const ticketTypesArray =
        paymentData.ticketTypes &&
          Array.isArray(paymentData.ticketTypes) &&
          paymentData.ticketTypes.length > 0
          ? paymentData.ticketTypes
          : [{ type: paymentData.ticketType, quantity: 1, price: paymentData.ticketPrice }];

      const ticketSeats = [];
      for (const item of ticketTypesArray) {
        const qty = Number(item.quantity) || 1;
        for (let i = 0; i < qty; i++) {
          ticketSeats.push({ type: item.type, price: Number(item.price) || 0 });
        }
      }

      const totalTicketCount = ticketSeats.length;
      fastify.log.info(`[step:2] ${totalTicketCount} ticket(s) to generate for ${reference}`);

      // ─── Step 3: Generate / retrieve all ticket IDs atomically ───────────────
      let ticketIds = [];

      await adminDb.runTransaction(async (transaction) => {
        const refDoc = await transaction.get(referenceDocRef);
        if (!refDoc.exists) throw new Error("Reference document not found during transaction");

        const refData = refDoc.data();

        if (
          refData.ticketIds &&
          Array.isArray(refData.ticketIds) &&
          refData.ticketIds.length === totalTicketCount
        ) {
          ticketIds = refData.ticketIds;
          fastify.log.info(`[step:3] Reusing existing ticketIds: ${ticketIds.join(", ")}`);
        } else {
          ticketIds = ticketSeats.map(() => generateTicketId());
          fastify.log.info(`[step:3] Generated ticketIds: ${ticketIds.join(", ")}`);
          transaction.update(referenceDocRef, {
            ticketIds,
            ticketIdGeneratedAt: nowIso,
            updatedAt: nowIso,
          });
        }
      });

      // ─── Shared base fields for every ticket document ─────────────────────────
      const baseTicketFields = {
        uid: effectiveUid,
        isGuest,
        fullName: buyerFullName,
        email: buyerEmail,
        phoneNumber: buyerPhone,
        ticketReference: reference,
        purchaseDate,
        purchaseTime,
        verified: false,
        paymentMethod: "Paystack",
        discountApplied: !!paymentData.discountCode,
        discountCode: paymentData.discountCode || null,
        referralCode: paymentData.referralCode || null,
        referralName: paymentData.referralName || null,
        eventId: paymentData.eventId,
        eventName: paymentData.eventName,
        eventCreatorId: paymentData.eventCreatorId,
        eventVenue: paymentData.eventVenue || null,
        eventType: paymentData.eventType || null,
        eventDate: paymentData.eventDate || null,
        eventEndDate: paymentData.eventEndDate || null,
        eventStart: paymentData.eventStart || null,
        eventEnd: paymentData.eventEnd || null,
        totalAmount: paymentData.totalAmount || 0,
        transactionFee: paymentData.transactionFee || 0,
        createdAt: nowIso,
      };

      // ─── Steps 4 & 5: Write tickets/{ticketId} and attendees/{ticketId} ───────
      const createdTicketIds = [];

      for (let i = 0; i < ticketSeats.length; i++) {
        const seat = ticketSeats[i];
        const ticketId = ticketIds[i];

        const ticketDoc = {
          ...baseTicketFields,
          ticketId,
          ticketType: seat.type,
          ticketPrice: seat.price,
          originalPrice: seat.price,
        };

        const ticketRef = adminDb.collection("tickets").doc(ticketId);
        const ticketSnap = await ticketRef.get();
        if (!ticketSnap.exists) {
          await ticketRef.set(ticketDoc);
        } else {
          fastify.log.info(`[step:4] tickets/${ticketId} already exists — skipping`);
        }

        const attendeeRef = adminDb
          .collection("events")
          .doc(paymentData.eventId)
          .collection("attendees")
          .doc(ticketId);
        const attendeeSnap = await attendeeRef.get();
        if (!attendeeSnap.exists) {
          await attendeeRef.set(ticketDoc);
        } else {
          fastify.log.info(`[step:5] attendees/${ticketId} already exists — skipping`);
        }

        createdTicketIds.push(ticketId);
      }

      fastify.log.info(`[step:4-5] Tickets and attendees written: ${createdTicketIds.join(", ")}`);

      // ─── Step 6: Atomic operations (stats / discounts) ────────────────────────
      try {
        const ATOMIC_API_URL = process.env.ATOMIC_API_URL;

        if (ATOMIC_API_URL) {
          const typeToFirstTicketId = {};
          for (let i = 0; i < ticketSeats.length; i++) {
            const type = ticketSeats[i].type;
            if (!(type in typeToFirstTicketId)) typeToFirstTicketId[type] = ticketIds[i];
          }

          for (const item of ticketTypesArray) {
            const idempotencyKey = typeToFirstTicketId[item.type] || ticketIds[0];
            const atomicResponse = await fetch(ATOMIC_API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ticketId: idempotencyKey,
                creatorId: paymentData.eventCreatorId,
                eventId: paymentData.eventId,
                ticketType: item.type,
                ticketPrice: item.price,
                quantity: Number(item.quantity) || 1,
                discountCode: paymentData.discountCode || null,
              }),
            });

            if (atomicResponse.ok) {
              const atomicResult = await atomicResponse.json();
              fastify.log.info(
                `[step:6] Atomic ops for type "${item.type}": ${atomicResult.alreadyProcessed ? "already processed" : "done"}`
              );
            } else {
              fastify.log.warn(`[step:6] Atomic API returned ${atomicResponse.status} for type "${item.type}"`);
            }
          }
        } else {
          fastify.log.warn("[step:6] ATOMIC_API_URL not configured — skipping");
        }
      } catch (atomicError) {
        fastify.log.error("[step:6] Atomic operations error (non-blocking):", atomicError);
      }

      // ─── Step 7: Update referral usage ────────────────────────────────────────
      // FIX: purchaseDate stored as nowIso (stable string) instead of `now` (new Date())
      // so arrayUnion dedup works correctly on retries.
      if (paymentData.referralCode || paymentData.referralName) {
        try {
          const referralCode = paymentData.referralCode || paymentData.referralName;
          const referralDocRef = adminDb
            .collection("events")
            .doc(paymentData.eventId)
            .collection("referrals")
            .doc(referralCode);

          const referralDoc = await referralDocRef.get();

          if (referralDoc.exists) {
            const usageEntries = createdTicketIds.map((tid, idx) => ({
              name: buyerFullName || "Unknown",
              ticketType: ticketSeats[idx].type,
              ticketId: tid,
              purchaseDate: nowIso, // was: now — fixed for arrayUnion idempotency
            }));

            await referralDocRef.update({
              usages: FieldValue.arrayUnion(...usageEntries),
              totalTickets: FieldValue.increment(totalTicketCount),
            });

            fastify.log.info(`[step:7] Referral "${referralCode}" updated with ${totalTicketCount} ticket(s)`);
          }
        } catch (error) {
          fastify.log.error("[step:7] Referral update error (non-blocking):", error);
        }
      }

      // ─── Step 8: Admin daily sales aggregation ────────────────────────────────
      // FIX: guard against re-incrementing on retry by checking ticketGenerated flag.
      const purchaseDateFormatted = nowIso.split("T")[0];
      const adminSalesRef = adminDb
        .collection("admin")
        .doc("events")
        .collection(paymentData.eventId)
        .doc(purchaseDateFormatted);

      try {
        await adminDb.runTransaction(async (transaction) => {
          const refDoc = await transaction.get(referenceDocRef);
          const salesDoc = await transaction.get(adminSalesRef);

          // Skip if this reference was already fully processed
          if (refDoc.data()?.ticketGenerated) {
            fastify.log.info("[step:8] Daily sales already recorded — skipping");
            return;
          }

          if (!salesDoc.exists) {
            transaction.set(adminSalesRef, {
              eventName: paymentData.eventName,
              ticketCount: totalTicketCount,
              ticketSales: paymentData.ticketPrice,
              lastPurchaseTime: purchaseTime,
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          } else {
            transaction.update(adminSalesRef, {
              ticketCount: FieldValue.increment(totalTicketCount),
              ticketSales: FieldValue.increment(paymentData.ticketPrice),
              lastPurchaseTime: purchaseTime,
              updatedAt: nowIso,
            });
          }
        });

        fastify.log.info(`[step:8] Daily sales updated for ${purchaseDateFormatted}`);
      } catch (error) {
        fastify.log.error("[step:8] Daily sales aggregation error (non-blocking):", error);
      }

      // ─── Step 9: Mark reference as fully generated ────────────────────────────
      await referenceDocRef.update({
        ticketGenerated: true,
        ticketGeneratedAt: nowIso,
        generatedTicketIds: createdTicketIds,
        totalTicketsGenerated: totalTicketCount,
        updatedAt: nowIso,
      });

      fastify.log.info(`[step:9] Reference ${reference} marked complete`);

      // ─── Step 10: Global analytics ────────────────────────────────────────────
      try {
        const ANALYTICS_FUNCTION_URL = process.env.ANALYTICS_FUNCTION_URL;

        if (ANALYTICS_FUNCTION_URL) {
          const analyticsResponse = await fetch(ANALYTICS_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticketPrice: paymentData.totalAmount || paymentData.ticketPrice,
              ticketId: createdTicketIds[0],
              ticketCount: totalTicketCount,
              transactionFee: paymentData.transactionFee || 0,
              eventId: paymentData.eventId,
              timestamp: nowIso,
            }),
          });

          if (analyticsResponse.ok) {
            const analyticsResult = await analyticsResponse.json();
            fastify.log.info(
              `[step:10] Analytics: ${analyticsResult.alreadyProcessed ? "already processed" : "updated"}`
            );
          } else {
            fastify.log.warn("[step:10] Analytics update failed — tickets still created");
          }
        } else {
          fastify.log.warn("[step:10] ANALYTICS_FUNCTION_URL not configured — skipping");
        }
      } catch (analyticsError) {
        fastify.log.error("[step:10] Analytics error (non-blocking):", analyticsError);
      }

      // ─── Step 11: Confirmation email ──────────────────────────────────────────
      try {
        const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:2000";
        const ticketTypeSummary = ticketTypesArray
          .map((item) => `${item.type}${Number(item.quantity) > 1 ? ` x${item.quantity}` : ""}`)
          .join(", ");
        const emailPayload = {
          email: buyerEmail,
          name: buyerFullName || "Valued Customer",
          ticket_IDs: createdTicketIds.join(", "),
          ticket_references: reference,
          event_host: paymentData.bookerName || "Event Host",
          event_name: paymentData.eventName,
          payment_ref: reference,
          ticket_types: ticketTypeSummary,
          booker_email: paymentData.bookerEmail || "support@spotix.com.ng",
          total_amount: (paymentData.totalAmount).toFixed(2),
          ticket_count: totalTicketCount,
          payment_method: "Paystack",
        };

        const emailResponse = await fetch(`${BACKEND_URL}/v1/mail/payment-confirmation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload),
        });

        if (emailResponse.ok) {
          fastify.log.info("[step:11] Confirmation email sent");
        } else {
          const responseBody = await emailResponse.text();
          fastify.log.warn(`[step:11] Email failed — status: ${emailResponse.status} | body: ${responseBody}`);
        }
      } catch (error) {
        fastify.log.error(`[step:11] Email error (non-blocking): ${error.message}`, { stack: error.stack });
      }
      // ─── Step 12: Success response ────────────────────────────────────────────
      return reply.code(200).send({
        success: true,
        message: `${totalTicketCount} ticket(s) generated successfully`,
        ticketIds: createdTicketIds,
        ticketReference: reference,
        totalTickets: totalTicketCount,
        eventId: paymentData.eventId,
        eventName: paymentData.eventName,
        totalAmount: paymentData.totalAmount,
        buyerInfo: {
          fullName: buyerFullName,
          email: buyerEmail,
          isGuest,
        },
        eventDetails: {
          eventVenue: paymentData.eventVenue,
          eventType: paymentData.eventType,
          eventDate: paymentData.eventDate,
          eventEndDate: paymentData.eventEndDate,
          eventStart: paymentData.eventStart,
          eventEnd: paymentData.eventEnd,
          bookerName: paymentData.bookerName,
          bookerEmail: paymentData.bookerEmail,
        },
        discountApplied: !!paymentData.discountCode,
        referralUsed: !!paymentData.referralCode,
        developer: "API developed and maintained by Spotix Technologies",
      });

    } catch (error) {
      fastify.log.error("Ticket generation error:", error?.message);
      fastify.log.error("Stack:", error?.stack);
      return reply.code(500).send({
        error: "Internal Server Error",
        message: "Failed to generate ticket",
        details: error?.message || String(error),
        developer: "API developed and maintained by Spotix Technologies",
      });
    }
  });

  fastify.get("/ticket/health", async (request, reply) => {
    return reply.code(200).send({
      status: "healthy",
      service: "Ticket Generation API",
      timestamp: new Date().toISOString(),
      developer: "API developed and maintained by Spotix Technologies",
    });
  });
}

function generateTicketId() {
  const randomNumbers = Math.floor(10000000 + Math.random() * 90000000).toString();
  const randomLetters = Math.random().toString(36).substring(2, 4).toUpperCase();

  const pos1 = Math.floor(Math.random() * 8);
  const pos2 = Math.floor(Math.random() * 7) + pos1 + 1;

  const part1 = randomNumbers.substring(0, pos1);
  const part2 = randomNumbers.substring(pos1, pos2);
  const part3 = randomNumbers.substring(pos2);

  return `SPTX-TX-${part1}${randomLetters[0]}${part2}${randomLetters[1]}${part3}`;
}