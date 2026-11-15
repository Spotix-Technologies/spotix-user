"use client"

import { useEffect, useState } from "react"

/** Scroll-spy: returns the id of the section currently crossing the middle of the viewport. */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState("")
  const key = ids.join("|")

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const els = key
      .split("|")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (!els.length) return

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (hit) setActive(hit.target.id)
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.1, 0.5, 1] },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [key])

  return active
}
