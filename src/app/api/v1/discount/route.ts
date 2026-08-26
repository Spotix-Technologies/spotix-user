import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

interface DiscountValidationRequest {
  code: string
  eventId: string
  /** Unique ticket type ("policy") names currently in the buyer's cart —
   *  used to check per-ticket eligibility for scoped discount codes. */
  ticketTypes?: string[]
}

// Firestore shape (events/{eventId}/discounts/{discountId}) — set by the
// booker app's "addDiscount"/"editDiscount" actions, see
// spotix-booker/app/api/event/list/[eventId]/route.ts
interface DiscountDoc {
  code: string
  type: "percentage" | "flat"
  value: number
  maxUses: number
  usedCount: number
  active: boolean
  applicableTickets?: string[] | null
  expiryDate?: string | null
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message, message }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const body: DiscountValidationRequest = await request.json()
    const { code, eventId, ticketTypes } = body

    if (!code || !eventId) {
      return fail("Missing required fields", 400)
    }

    const discountsCollectionRef = adminDb.collection("events").doc(eventId).collection("discounts")

    const querySnapshot = await discountsCollectionRef
      .where("code", "==", code.trim().toUpperCase())
      .limit(1)
      .get()

    // Codes are stored with whatever casing the booker typed — fall back to
    // a case-insensitive scan if the uppercase-normalised lookup misses.
    let discountDoc = querySnapshot.docs[0]
    if (!discountDoc) {
      const all = await discountsCollectionRef.get()
      discountDoc = all.docs.find((d) => d.data().code?.toString().toLowerCase() === code.trim().toLowerCase())!
    }

    if (!discountDoc) {
      return fail("Invalid discount code", 404)
    }

    const discountData = discountDoc.data() as DiscountDoc

    if (!discountData.active) {
      return fail("This discount code is no longer active", 400)
    }

    if (discountData.expiryDate) {
      const expiry = new Date(discountData.expiryDate)
      if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now()) {
        return fail("This discount code has expired", 410)
      }
    }

    if ((discountData.usedCount ?? 0) >= (discountData.maxUses ?? 1)) {
      return fail("This discount code has reached its maximum usage limit", 400)
    }

    // Per-ticket-type eligibility: only enforced when the code is scoped
    // (applicableTickets non-empty) AND the caller told us what's in the cart.
    const scope = discountData.applicableTickets
    if (scope && scope.length > 0 && ticketTypes && ticketTypes.length > 0) {
      const anyEligible = ticketTypes.some((t) => scope.includes(t))
      if (!anyEligible) {
        return fail(`This code only applies to: ${scope.join(", ")}`, 422)
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: discountDoc.id,
        code: discountData.code,
        discountType: discountData.type,
        discountValue: discountData.value,
        maxUses: discountData.maxUses ?? 1,
        currentUses: discountData.usedCount ?? 0,
        expiryDate: discountData.expiryDate ?? null,
        applicableTickets: scope && scope.length > 0 ? scope : null,
        message: "Discount code is valid",
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error validating discount:", error)
    return fail("Internal server error", 500)
  }
}
