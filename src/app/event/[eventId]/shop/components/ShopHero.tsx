"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronRight } from "lucide-react"

interface Crumb {
  label: string
  href?: string
}

interface ShopHeroProps {
  image: string
  title: string
  subtitle?: string
  /** Breadcrumb trail rendered inside the overlay, e.g.
   *  event > shop > {merchName}. Last entry (no href) is the current page. */
  crumbs?: Crumb[]
}

/**
 * Shared hero banner for the shop listing page ("{eventName}'s shop")
 * and the merch details page (event > shop > {merchName} breadcrumb) —
 * the main image as a full-bleed background with a dark overlay so the
 * text on top stays readable regardless of the image underneath.
 */
export function ShopHero({ image, title, subtitle, crumbs }: ShopHeroProps) {
  const router = useRouter()

  return (
    <div className="relative w-full h-56 sm:h-72 lg:h-80 overflow-hidden rounded-2xl bg-gray-900">
      <img
        src={image || "/placeholder.svg"}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark overlay — keeps the title/breadcrumb readable over any image */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

      <button
        onClick={() => router.back()}
        aria-label="Go back"
        className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white px-3 py-2 rounded-full transition-colors"
      >
        <ArrowLeft size={16} />
        <span className="text-xs font-medium hidden sm:inline">Back</span>
      </button>

      {crumbs && crumbs.length > 0 && (
        <div className="absolute top-[3.25rem] sm:top-5 left-4 sm:left-24 right-4 z-10 flex items-center gap-1.5 flex-wrap text-[11px] sm:text-sm">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight size={12} className="text-white/50 shrink-0" />}
              {c.href ? (
                <Link
                  href={c.href}
                  className="text-white/80 hover:text-white transition-colors truncate max-w-[120px] sm:max-w-[220px]"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="text-white font-semibold truncate max-w-[140px] sm:max-w-[260px]">
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-7 z-10">
        <h1 className="text-white text-xl sm:text-3xl lg:text-4xl font-bold leading-tight drop-shadow-lg">
          {title}
        </h1>
        {subtitle && <p className="text-white/80 text-xs sm:text-sm mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}
