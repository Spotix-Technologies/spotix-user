/**
 * app/api/v1/agent-ref/[refId]/confirm-free/route.ts
 * POST — confirms a FREE agent-sold ticket with no payment step, mirroring
 * /api/v1/ref/free's convention of setting status: "successful" directly
 * (no Paystack charge occurs for a ₦0 reference, so there's no webhook to
 * do this). The success page then generates the actual ticket the same
 * way it does for any other "successful" reference.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ refId: string }> }
) {
  const { refId } = await params
  if (!refId) return NextResponse.json({ success: false, error: "Reference is required" }, { status: 400 })

  try {
    const ref = adminDb.collection("Reference").doc(refId)
    const doc = await ref.get()
    if (!doc.exists) return NextResponse.json({ success: false, error: "Reference not found" }, { status: 404 })

    const r = doc.data()!
    if (!r.isAgentSale) return NextResponse.json({ success: false, error: "Invalid reference" }, { status: 400 })
    if (r.totalAmount !== 0) return NextResponse.json({ success: false, error: "This ticket is not free" }, { status: 400 })

    if (r.status !== "successful") {
      await ref.update({ status: "successful", updatedAt: new Date().toISOString() })
    }

    return NextResponse.json({ success: true, reference: refId })
  } catch (err: any) {
    console.error("[POST agent-ref confirm-free] failed:", err)
    return NextResponse.json({ success: false, error: "Unable to confirm this ticket" }, { status: 500 })
  }
}
