"use client"

import { useActiveSection } from "../hooks/useActiveSection"

export interface SectionNavItem {
  id: string
  label: string
}

/** Sticky glass pill under the site header: jump between sections, highlights the one in view. */
export function SectionNav({ items }: { items: SectionNavItem[] }) {
  const active = useActiveSection(items.map((i) => i.id))

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <div className="pointer-events-none sticky top-[84px] z-40 flex justify-center px-4 py-3">
      <nav
        aria-label="Event sections"
        className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-gray-200/80 bg-white/80 p-1 shadow-lg shadow-black/5 backdrop-blur-xl [scrollbar-width:none]"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => jump(item.id)}
            aria-current={active === item.id ? "true" : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors sm:px-5 ${
              active === item.id ? "bg-[#171123] text-white" : "text-[#171123] hover:bg-gray-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
