"use client"

import React from "react"
import { ArrowLeft, ArrowRight } from "lucide-react"

interface PaginationProps {
  page: number
  pageCount: number
  onChange: (page: number) => void
}

/** 1 … 4 5 6 … 12 — always keeps first/last and a window around the current page. */
function pageItems(page: number, count: number): (number | "…")[] {
  if (count <= 5) return Array.from({ length: count }, (_, i) => i + 1)
  const items: (number | "…")[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(count - 1, page + 1)
  if (start > 2) items.push("…")
  for (let p = start; p <= end; p++) items.push(p)
  if (end < count - 1) items.push("…")
  items.push(count)
  return items
}

const Pagination: React.FC<PaginationProps> = ({ page, pageCount, onChange }) => {
  if (pageCount <= 1) return null

  const circle = "grid h-9 w-9 place-items-center rounded-full text-sm transition-colors"

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-1.5">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className={`${circle} text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent`}
      >
        <ArrowLeft size={16} />
      </button>
      {pageItems(page, pageCount).map((item, i) =>
        item === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-gray-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={`${circle} ${
              item === page ? "bg-[#6b2fa5] font-semibold text-white" : "border border-gray-200 text-gray-700 hover:bg-gray-100"
            }`}
          >
            {String(item).padStart(2, "0")}
          </button>
        )
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
        className={`${circle} text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent`}
      >
        <ArrowRight size={16} />
      </button>
    </nav>
  )
}

export default Pagination
