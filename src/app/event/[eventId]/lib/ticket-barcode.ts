/**
 * Deterministic, purely decorative barcode for the ticket cards — the same seed
 * always yields the same bars, so cards don't change between renders.
 */
export function buildBarcode(seed: string, count = 54): { bars: { x: number; w: number }[]; width: number } {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }

  const bars: { x: number; w: number }[] = []
  let x = 0
  for (let i = 0; i < count; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h ^= h >>> 13
    const w = 1 + ((h >>> 0) % 3)
    bars.push({ x, w })
    x += w + 1 + (((h >>> 8) >>> 0) % 2)
  }
  return { bars, width: x }
}
