"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

/** Slide duration — keep in sync with the `duration-300` classes below */
const DRAWER_ANIM_MS = 300

interface DrawerShellProps {
  /** Called once the slide-out has finished — unmount the drawer here */
  onClose: () => void
  /** Accessible name for the dialog */
  ariaLabel: string
  /** Panel content. Receives `close`, which plays the slide-out and then calls `onClose`. */
  children: (close: () => void) => ReactNode
}

/**
 * Shared sheet chrome for the event page: a bottom sheet on mobile and a right-hand side
 * drawer from `md` up, with a dimmed/blurred backdrop, slide in/out, and Escape / backdrop
 * click to close.
 *
 * It sits at z-[1100] because the site header is sticky at z-index 1000
 * (components/header.styled.tsx) and must not paint over the top of the panel.
 *
 * The parent mounts this to open it and unmounts it in `onClose`; the exit animation is
 * handled here. Body scroll locking stays with the parent (see ClientPage).
 */
export function DrawerShell({ onClose, ariaLabel, children }: DrawerShellProps) {
  const [open, setOpen] = useState(false)
  const closingRef = useRef(false)
  const closeTimerRef = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Slide in on the frame after mount so the closed → open transition actually plays
  useEffect(() => {
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setOpen(true)
        panelRef.current?.focus({ preventScroll: true })
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [])

  const close = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setOpen(false)
    closeTimerRef.current = window.setTimeout(onClose, DRAWER_ANIM_MS)
  }, [onClose])

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current)
    },
    []
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [close])

  return (
    <div className="fixed inset-0 z-[1100]">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={close}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`absolute bottom-0 left-0 right-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none md:bottom-0 md:left-auto md:right-0 md:top-0 md:max-h-none md:w-[460px] md:rounded-l-3xl md:rounded-tr-none ${
          open
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full"
        }`}
      >
        {children(close)}
      </div>
    </div>
  )
}
