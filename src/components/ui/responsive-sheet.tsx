"use client"

/**
 * src/components/ui/responsive-sheet.tsx
 *
 * The one overlay primitive for every "modal" in the user app (same
 * component as spotix-booker). Sits at z-[1100] because the site header is
 * sticky at z-index 1000.
 *
 *   • < 768px  → bottom sheet: slides up from the bottom edge, rounded top
 *                corners, drag handle, swipe-down to dismiss, respects the
 *                iOS/Android safe-area inset and the dynamic viewport (dvh).
 *   • ≥ 768px  → side drawer: slides in from the right edge, full height.
 *
 * Why this replaces the old centered `fixed inset-0 … flex items-center`
 * cards: centered dialogs overflow short phone screens, fight the on-screen
 * keyboard, and put the close target out of thumb reach. Sheets/drawers keep
 * the content anchored to an edge and scroll internally.
 *
 * Behaviour handled here so call sites don't have to:
 *   – rendered through a portal into <body>, so a transformed ancestor (any
 *     `animate-in` wrapper) can't break `position: fixed`
 *   – enter AND exit animation (stays mounted until the exit finishes)
 *   – Escape / backdrop click / swipe-down / X to dismiss (all disabled by
 *     `dismissible={false}`, e.g. while a payment or upload is in flight)
 *   – stacked sheets: only the top-most reacts to Escape
 *   – reference-counted page scroll lock (no scrollbar layout shift)
 *   – focus moves into the panel, is trapped while open, and is restored on
 *     close; role="dialog" / aria-modal / aria-labelledby wired up
 *
 * Usage:
 *   <ResponsiveSheet open={open} onClose={close} title="Receipt" description="…" size="md"
 *     footer={<button …>Download</button>}>
 *     …body…
 *   </ResponsiveSheet>
 *
 * `open` may be driven by `{cond && <Comp/>}` parents too — just pass
 * `open` (always true) from inside the child; unmounting the child unmounts
 * the sheet immediately, without an exit animation. Prefer keeping the
 * component mounted and toggling `open` when the exit animation matters.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

// ─── viewport detection ──────────────────────────────────────────────────

const DESKTOP_QUERY = "(min-width: 768px)"

function subscribeDesktop(cb: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY)
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

/** true at ≥768px (drawer), false below (sheet). SSR-safe: false on the server. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  )
}

// ─── page scroll lock (ref-counted so stacked sheets don't fight) ────────

let lockCount = 0
let savedOverflow = ""
let savedPaddingRight = ""

function lockScroll() {
  if (lockCount++ > 0) return
  const root = document.documentElement
  const scrollbar = window.innerWidth - root.clientWidth
  savedOverflow = root.style.overflow
  savedPaddingRight = root.style.paddingRight
  root.style.overflow = "hidden"
  if (scrollbar > 0) root.style.paddingRight = `${scrollbar}px`
}

function unlockScroll() {
  if (--lockCount > 0) return
  lockCount = 0
  const root = document.documentElement
  root.style.overflow = savedOverflow
  root.style.paddingRight = savedPaddingRight
}

// ─── stack of open sheets (Escape only closes the top-most) ──────────────

const sheetStack: string[] = []

// ─── sizing ──────────────────────────────────────────────────────────────

export type SheetSize = "sm" | "md" | "lg" | "xl" | "full"

/** Drawer widths (desktop). Bottom sheets are always full width, capped at
 *  `SHEET_MAX_WIDTH` on tablets so they don't stretch absurdly. */
const DRAWER_WIDTH: Record<SheetSize, string> = {
  sm: "min(100vw, 26rem)",
  md: "min(100vw, 30rem)",
  lg: "min(100vw, 40rem)",
  xl: "min(100vw, 52rem)",
  full: "min(100vw, 72rem)",
}

const DURATION = 300
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)"

// ─── component ───────────────────────────────────────────────────────────

export interface ResponsiveSheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  /** Small element rendered before the title (icon tile, avatar…). */
  icon?: ReactNode
  /** Extra controls in the header, left of the close button. */
  headerActions?: ReactNode
  children: ReactNode
  /** Sticky footer (action buttons). */
  footer?: ReactNode
  size?: SheetSize
  /** false → Escape, backdrop tap and swipe-down are disabled. The X is
   *  hidden too, unless `showClose` forces it on. */
  dismissible?: boolean
  /** Show the X button (defaults to `dismissible`). `dismissible={false}
   *  showClose` = only the X closes it (e.g. guest checkout, where a stray
   *  backdrop tap would navigate the buyer away). */
  showClose?: boolean
  /** Skip the built-in header — the children render their own. A floating
   *  close button is still shown unless `showClose={false}`. */
  hideHeader?: boolean
  role?: "dialog" | "alertdialog"
  /** Accessible name when there is no visible `title`. */
  ariaLabel?: string
  /** Stacking order (default 1100, above the sticky site header). Raise it
   *  for a sheet that opens on top of another one. */
  zIndex?: number
  /** Extra classes on the panel. */
  className?: string
  /** Replaces the default body padding (`px-5 py-4`). */
  bodyClassName?: string
  /** Mobile only: fill the whole dynamic viewport instead of hugging content
   *  (map picker, scanners). */
  fullHeightOnMobile?: boolean
}

export function ResponsiveSheet({
  open,
  onClose,
  title,
  description,
  icon,
  headerActions,
  children,
  footer,
  size = "md",
  dismissible = true,
  showClose,
  hideHeader = false,
  role = "dialog",
  ariaLabel,
  zIndex = 1100,
  className = "",
  bodyClassName = "px-5 py-4",
  fullHeightOnMobile = false,
}: ResponsiveSheetProps) {
  const isDesktop = useIsDesktop()
  const id = useId()
  const titleId = `${id}-title`
  const descId = `${id}-desc`

  const [hasDom, setHasDom] = useState(false)
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const dismissibleRef = useRef(dismissible)
  dismissibleRef.current = dismissible

  useEffect(() => setHasDom(true), [])

  // mount → next frame → slide in; on close slide out → unmount.
  useEffect(() => {
    if (open) {
      setMounted(true)
      let raf2 = 0
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(true))
      })
      return () => {
        cancelAnimationFrame(raf1)
        cancelAnimationFrame(raf2)
      }
    }
    setShown(false)
    setDragY(0)
    const t = setTimeout(() => setMounted(false), DURATION)
    return () => clearTimeout(t)
  }, [open])

  // scroll lock + escape stack + focus management while mounted
  useEffect(() => {
    if (!mounted) return
    lockScroll()
    sheetStack.push(id)
    restoreFocusRef.current = document.activeElement as HTMLElement | null

    const focusTimer = setTimeout(() => {
      const panel = panelRef.current
      if (panel && !panel.contains(document.activeElement)) panel.focus()
    }, 50)

    function onKeyDown(e: KeyboardEvent) {
      if (sheetStack[sheetStack.length - 1] !== id) return
      if (e.key === "Escape") {
        if (dismissibleRef.current) {
          e.stopPropagation()
          onCloseRef.current()
        }
        return
      }
      if (e.key !== "Tab") return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null)
      if (focusables.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)

    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener("keydown", onKeyDown)
      const i = sheetStack.lastIndexOf(id)
      if (i >= 0) sheetStack.splice(i, 1)
      unlockScroll()
      restoreFocusRef.current?.focus?.()
    }
  }, [mounted, id])

  // ── swipe-down to dismiss (bottom sheet only) ──
  const dragStart = useRef<{ y: number; t: number } | null>(null)

  const onDragStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (isDesktop || !dismissible) return
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea")) return
      dragStart.current = { y: e.clientY, t: Date.now() }
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [isDesktop, dismissible],
  )
  const onDragMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    setDragY(Math.max(0, e.clientY - dragStart.current.y))
  }, [])
  const onDragEnd = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const start = dragStart.current
      if (!start) return
      dragStart.current = null
      setDragging(false)
      const dy = Math.max(0, e.clientY - start.y)
      const velocity = dy / Math.max(1, Date.now() - start.t) // px / ms
      if (dy > 110 || (dy > 40 && velocity > 0.6)) {
        onCloseRef.current()
      } else {
        setDragY(0)
      }
    },
    [],
  )

  if (!hasDom || !mounted) return null

  const closeVisible = showClose ?? dismissible
  const hasHeaderContent = !!(title || description || icon || headerActions)

  const panelStyle: CSSProperties = isDesktop
    ? {
        width: DRAWER_WIDTH[size],
        transform: shown ? "translateX(0)" : "translateX(100%)",
        transition: `transform ${DURATION}ms ${EASE}`,
      }
    : {
        transform: shown ? `translateY(${dragY}px)` : "translateY(100%)",
        transition: dragging ? "none" : `transform ${DURATION}ms ${EASE}`,
        maxHeight: fullHeightOnMobile ? undefined : "92dvh",
        height: fullHeightOnMobile ? "94dvh" : undefined,
      }

  const panelClasses = isDesktop
    ? "absolute inset-y-0 right-0 h-full rounded-l-2xl"
    : "absolute inset-x-0 bottom-0 mx-auto w-full max-w-[44rem] rounded-t-3xl"

  return createPortal(
    <div className="fixed inset-0" style={{ zIndex }}>
      {/* backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        style={{
          opacity: shown ? 1 : 0,
          transition: `opacity ${DURATION}ms ease`,
        }}
        onClick={() => {
          if (dismissible) onClose()
        }}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        className={`${panelClasses} flex flex-col bg-white shadow-2xl outline-none overflow-hidden ${className}`}
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* drag handle (mobile) */}
        {!isDesktop && (
          <div
            className="flex justify-center pt-2.5 pb-1 shrink-0 touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            <div className="h-1.5 w-10 rounded-full bg-slate-200" />
          </div>
        )}

        {!hideHeader && (hasHeaderContent || closeVisible) && (
          <div
            className="flex items-start gap-3 px-5 pt-3 pb-3 sm:pt-4 border-b border-slate-100 shrink-0 touch-none md:touch-auto"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
          >
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id={titleId} className="text-base font-bold text-slate-900 leading-snug">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  {description}
                </p>
              )}
            </div>
            {headerActions && <div className="shrink-0 flex items-center gap-2">{headerActions}</div>}
            {closeVisible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 -mr-1.5 -mt-1 grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {hideHeader && closeVisible && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* body — the only part that scrolls */}
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain ${bodyClassName}`}
          style={!footer && !isDesktop ? { paddingBottom: "max(1rem, env(safe-area-inset-bottom))" } : undefined}
        >
          {children}
        </div>

        {footer && (
          <div
            className="shrink-0 border-t border-slate-100 bg-white px-5 pt-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default ResponsiveSheet
