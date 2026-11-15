"use client"

import React from "react"
import Link from "next/link"
import { optimizeImage } from "../lib/format"
import type { EventCollection } from "../types"

interface CollectionsRowProps {
  collections: EventCollection[]
  loading: boolean
}

/** Slim horizontal strip of event collections. Renders nothing when there are none. */
const CollectionsRow: React.FC<CollectionsRowProps> = ({ collections, loading }) => {
  if (!loading && collections.length === 0) return null

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Collections</h2>
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-44 shrink-0 animate-pulse">
                <div className="aspect-[4/3] rounded-2xl bg-gray-200" />
                <div className="mt-2 h-4 w-2/3 rounded bg-gray-200" />
              </div>
            ))
          : collections.map((c) => (
              <Link
                key={c.collectionId}
                href={`/event-group/${c.collectionId}`}
                prefetch={false}
                className="group w-44 shrink-0"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
                  <img
                    src={optimizeImage(c.eventImage, 400, 300)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 truncate text-sm font-medium text-gray-900">{c.collectionName || "Untitled collection"}</p>
              </Link>
            ))}
      </div>
    </section>
  )
}

export default CollectionsRow
