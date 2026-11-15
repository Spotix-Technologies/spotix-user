// app/lib/request-device.ts
//
// Coarse device-type classification from a User-Agent header — reduced
// to one of Numerox's own NumeroxDeviceType buckets (never the raw UA
// string, never a fingerprint; see numerox's src/types/tracking.ts).
// Resolved server-side, inside the trusted ingestion route, so the
// browser doesn't need to ship its own UA-sniffing code — one fewer
// thing in the event-page bundle, and it can't be spoofed by a client
// script the way a browser-reported value could.

import type { NumeroxDeviceType } from "@drexx-codes/numerox"

export function classifyDeviceType(userAgent: string | null): NumeroxDeviceType {
  if (!userAgent) return "unknown"
  const ua = userAgent.toLowerCase()

  // Tablets first — an iPad or a "desktop-mode" Android tablet both
  // otherwise match the phone-OS checks below.
  const isIpad = ua.includes("ipad") || (ua.includes("macintosh") && ua.includes("touch"))
  const isAndroidTablet = ua.includes("android") && !ua.includes("mobile")
  if (isIpad || isAndroidTablet || ua.includes("tablet")) return "tablet"

  if (ua.includes("iphone") || ua.includes("ipod")) return "ios"
  if (ua.includes("android")) return "android"
  if (ua.includes("windows")) return "windows"
  if (ua.includes("macintosh") || ua.includes("mac os x")) return "mac"
  if (ua.includes("linux") || ua.includes("x11")) return "linux"

  return "unknown"
}
