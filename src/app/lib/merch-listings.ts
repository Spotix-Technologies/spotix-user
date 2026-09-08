/**
 * src/app/lib/merch-listings.ts
 *
 * Read-only Supabase lookups for merch listings, from the buyer-facing
 * side. Mirrors the shape of spotix-booker's lib/merch-db.ts
 * (getMerchListingById) but only exposes what spotix-user ever needs:
 * looking a listing up by id to render it (api/v1/event/merch) or to
 * price/validate a purchase server-side (api/v1/create-merch-ref).
 *
 * Never writes to merch_listings from here — quantity/total_sold are only
 * ever mutated by spotix-backend's record_merch_order() RPC, after payment
 * actually succeeds.
 */

import { supabaseAdmin } from "./supabase"

export interface MerchListing {
  id: string
  bookerId: string
  productName: string
  description: string
  price: number
  images: string[]
  quantity: number
  status: "active" | "inactive"
  /** Who pays the 5% Spotix fee + the Paystack fee on this listing's
   *  sales — set by the booker at creation/edit time (Manage Listings).
   *  Defaults to the buyer bearing both. See create-merch-ref/route.ts
   *  for how this is applied per cart line. */
  feeBurden: { coversSpotixFee: boolean; coversPaystackFee: boolean }
}

const LISTING_COLUMNS = "id, booker_id, product_name, description, price, images, quantity, status, fee_burden"

const DEFAULT_FEE_BURDEN = { coversSpotixFee: false, coversPaystackFee: false }

function mapListingRow(row: any): MerchListing {
  return {
    id: row.id,
    bookerId: row.booker_id,
    productName: row.product_name ?? "",
    description: row.description ?? "",
    price: Number(row.price ?? 0),
    images: row.images ?? [],
    quantity: Number(row.quantity ?? 0),
    status: (row.status as "active" | "inactive") ?? "active",
    feeBurden:
      row.fee_burden && typeof row.fee_burden === "object"
        ? {
            coversSpotixFee: row.fee_burden.coversSpotixFee === true,
            coversPaystackFee: row.fee_burden.coversPaystackFee === true,
          }
        : DEFAULT_FEE_BURDEN,
  }
}

export async function getMerchListingById(listingId: string): Promise<MerchListing | null> {
  const { data, error } = await supabaseAdmin
    .from("merch_listings")
    .select(LISTING_COLUMNS)
    .eq("id", listingId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapListingRow(data)
}

/** Batch variant for the event-merch listing page — one round trip instead
 *  of N. Returns listings in no particular order; callers should re-key by
 *  id if they need to preserve the caller's listingIds order. */
export async function getMerchListingsByIds(listingIds: string[]): Promise<MerchListing[]> {
  if (listingIds.length === 0) return []
  const { data, error } = await supabaseAdmin
    .from("merch_listings")
    .select(LISTING_COLUMNS)
    .in("id", listingIds)

  if (error) throw error
  return (data ?? []).map(mapListingRow)
}
