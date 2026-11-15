"use client"

import useSWR from "swr"
import { FEATURED_DEDUPE_MS } from "../constants"
import { FEATURED_KEY, fetchFeaturedEvents } from "../lib/featured"
import type { FeaturedEvent } from "../types"

/**
 * Featured events from Firestore. Same SWR key as the landing page, so a
 * visitor coming from there gets the cached list instantly. Focus
 * revalidation is off — each refetch is a billable Firestore read.
 */
export function useFeaturedEvents() {
  const { data, isLoading } = useSWR<FeaturedEvent[]>(FEATURED_KEY, fetchFeaturedEvents, {
    revalidateOnFocus: false,
    dedupingInterval: FEATURED_DEDUPE_MS,
  })
  return { featured: data ?? [], loading: isLoading }
}
