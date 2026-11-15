import type { ReactNode } from "react"

interface SectionHeadingProps {
  kicker: string
  title: string
  /** Second line, rendered in a lighter italic */
  accent?: string
  /** Optional copy aligned to the right on desktop */
  aside?: ReactNode
}

/** Shared "— KICKER / Big title / *accent.*" block used by every section. */
export function SectionHeading({ kicker, title, accent, aside }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#6b2fa5]">
          <span aria-hidden="true" className="h-px w-10 bg-current" />
          {kicker}
        </p>
        <h2 className="mt-4 text-balance text-4xl font-bold leading-[1.02] tracking-tight text-[#171123] sm:text-5xl lg:text-6xl">
          {title}
          {accent && <span className="block font-normal italic text-gray-400">{accent}</span>}
        </h2>
      </div>
      {aside && <div className="max-w-sm space-y-1 text-lg leading-snug text-gray-500 lg:text-right">{aside}</div>}
    </div>
  )
}
