/**
 * Hard-locks the document's own scrolling.
 *
 * Lenis' stop() only stops Lenis — it does not block native scrolling (scrollbar drag,
 * middle-click autoscroll, #anchor jumps) unless lenis.css is loaded, which it isn't here.
 * `overflow: hidden` on <html> closes all of those. `scrollbar-gutter: stable` keeps the
 * scrollbar's space reserved so the layout doesn't shift when the lock toggles.
 */
export function lockRootScroll(locked: boolean): void {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (locked) {
    root.style.overflow = "hidden"
    root.style.scrollbarGutter = "stable"
  } else {
    root.style.removeProperty("overflow")
    root.style.removeProperty("scrollbar-gutter")
  }
}
