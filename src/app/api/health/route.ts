export const dynamic = "force-dynamic"

/** Liveness check for uptime monitors / load balancers. No auth, no DB, no side effects. */
export function GET() {
  return Response.json(
    { status: "ok", healthy: true, timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  )
}
