/**
 * Builds a URL for the self-hosted Dicebear avatar route
 * (spotix-backend/v1/dicebear.js). Mirrors
 * spotix-booker/app/lib/dicebear.ts so nominee avatars look consistent
 * with the rest of Spotix.
 */
export function dicebearAvatarUrl(
  seed: string,
  opts?: { style?: "avataaars" | "micah" | "identicon"; size?: number }
) {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || ""
  const style = opts?.style || "avataaars"
  const size = opts?.size || 128
  const cleanSeed = (seed || "unknown").trim().toLowerCase()
  return `${backend}/v1/dicebear/${encodeURIComponent(cleanSeed)}?style=${style}&size=${size}`
}
