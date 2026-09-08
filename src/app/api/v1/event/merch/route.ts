/**
 * src/app/api/v1/event/merch/route.ts
 *
 * GET /api/v1/event/merch?eventId=...&limit=...
 *   -> Fetches merch attached to an event, enriched with live product
 *      data and this event's Burden of Fee setting.
 *
 * Firestore only stores the event<->listing LINK
 * (events/{eventId}/listings/{firestoreId} -> { listingId, userId }).
 * Product data itself (name, description, price, images, stock, status)
 * lives in Supabase's merch_listings table (see
 * src/app/lib/merch-listings.ts) -- the old
 * `listing/{userId}/products/{listingId}` Firestore path this route used
 * to read no longer has any real data; spotix-booker writes listings
 * straight to Supabase now.
 *
 * Only "active" listings are surfaced to buyers -- an "inactive" listing
 * (booker paused selling from Manage Listings) stays linked to the event
 * but drops out of this response until reactivated.
 *
 * Burden of Fee: the `price` returned per item is buyer-facing, not the
 * raw Supabase price -- when THAT LISTING's OWN fee_burden (Supabase,
 * set by the booker per-product) has the buyer covering Spotix's merch
 * fee, that fee is baked straight into the number shown (see
 * utils/merchPricing.ts), so what's shown here always matches what
 * create-merch-ref will actually charge for that line, up to Paystack's
 * own fee -- that one's only known at checkout, so callers get
 * `feeBurden.buyerOwesPaystackFee` back to hint at it instead
 * ("Paystack's fee is added at checkout"). Not the event's Firestore
 * Burden-of-Fee setting -- that's a ticket-only concept.
 *
 * `limit`: optional, caps how many active listings come back (order
 * preserved from events/{eventId}/listings) -- the event page's merch
 * teaser asks for `limit=3` and links out to the full shop
 * (/event/{eventId}/shop), which calls this with no limit at all.
 * `totalCount`/`hasMore` describe the FULL active set regardless of the
 * slice actually returned, so the teaser can show "3 of N — view all".
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { getMerchListingsByIds } from "@/app/lib/merch-listings"
import { computeMerchDisplayPrice } from "@/utils/merchPricing"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get("eventId")
    const rawLimit = searchParams.get("limit")
    const limit =
      rawLimit && Number.isFinite(Number(rawLimit)) && Number(rawLimit) > 0
        ? Math.floor(Number(rawLimit))
        : null

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: eventId is required" },
        { status: 400 }
      )
    }

    // Step 1: Fetch listing references from events/{eventId}/listings
    const listingsSnapshot = await adminDb
      .collection("events")
      .doc(eventId)
      .collection("listings")
      .get()

    if (listingsSnapshot.empty) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          totalCount: 0,
          hasMore: false,
          feeBurden: { buyerOwesSpotixFee: false, buyerOwesPaystackFee: false },
        },
        { status: 200 }
      )
    }

    const listingIds = listingsSnapshot.docs
      .map((d) => d.data()?.listingId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)

    // Step 2: Fetch full listing data from Supabase, one round trip. Each
    // listing carries its OWN fee_burden (set by the booker per-product
    // from Manage Listings) -- that's what decides whether the price
    // below includes Spotix's merch fee, NOT the event's Firestore
    // Burden-of-Fee setting (a ticket-only concept; see create-merch-ref
    // for the matching checkout-time logic).
    const listings = await getMerchListingsByIds(listingIds)
    const listingById = new Map(listings.map((l) => [l.id, l]))

    // Preserve events/{eventId}/listings order, drop anything missing or
    // paused, and shape into what the shop UI expects.
    const activeListings = listingIds
      .map((id) => listingById.get(id))
      .filter((l): l is NonNullable<typeof l> => !!l && l.status === "active")

    const totalCount = activeListings.length
    const slice = limit ? activeListings.slice(0, limit) : activeListings

    const merchData = slice.map((l) => ({
      id: l.id,
      name: l.productName,
      description: l.description,
      price: computeMerchDisplayPrice(l.price, l.feeBurden),
      image: l.images?.[0] ?? "",
      stock: l.quantity,
    }))

    // Response-level feeBurden is a display hint only (Paystack's fee
    // isn't attributable to a single item) -- representative of the
    // first active listing shown, since different listings can carry
    // different fee_burden values; per-item pricing above is already
    // correct per listing regardless.
    const hintBurden = slice[0]?.feeBurden ?? { coversSpotixFee: false, coversPaystackFee: false }

    return NextResponse.json(
      {
        success: true,
        data: merchData,
        totalCount,
        hasMore: limit ? totalCount > limit : false,
        feeBurden: {
          buyerOwesSpotixFee: !hintBurden.coversSpotixFee,
          buyerOwesPaystackFee: !hintBurden.coversPaystackFee,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
      }
    )
  } catch (error) {
    console.error("Error fetching event merchandise:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    )
  }
}
