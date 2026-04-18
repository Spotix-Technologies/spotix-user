import { type NextRequest, NextResponse } from "next/server"
import { adminDb, adminAuth } from "@/app/lib/firebase-admin"

interface DiscountValidationRequest {
  code: string
  eventId: string
  // eventCreatorId: string
}

interface DiscountData {
  code: string
  type: "percentage" | "flat"
  value: number
  maxUses: number
  usedCount: number
  active: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: DiscountValidationRequest = await request.json()
    const { code, eventId } = body

    // Validate required fields
    if (!code || !eventId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // // Verify user authentication
    // const authHeader = request.headers.get("authorization")
    // if (!authHeader?.startsWith("Bearer ")) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    // const token = authHeader.split("Bearer ")[1]
    // const decodedToken = await adminAuth.verifyIdToken(token)

    const discountsCollectionRef = adminDb
      .collection("events")
      .doc(eventId)
      .collection("discounts")

    const querySnapshot = await discountsCollectionRef.where("code", "==", code.trim()).get()

    if (querySnapshot.empty) {
      return NextResponse.json({ error: "Invalid discount code" }, { status: 404 })
    }

    const discountDoc = querySnapshot.docs[0]
    const discountData = discountDoc.data() as DiscountData

    // Check if discount is active
    if (!discountData.active) {
      return NextResponse.json({ error: "This discount code is no longer active" }, { status: 400 })
    }

    // Check if discount has reached max uses
    if (discountData.usedCount >= discountData.maxUses) {
      return NextResponse.json({ error: "This discount code has reached its maximum usage limit" }, { status: 400 })
    }

    // Calculate discounted price
    let discountedPrice = 0
    if (discountData.type === "percentage") {
      const discountRate = Math.min(discountData.value, 100) / 100
      discountedPrice = discountData.value
    } else {
      discountedPrice = discountData.value
    }

    return NextResponse.json({
      success: true,
      discount: {
        code: discountData.code,
        type: discountData.type,
        value: discountData.value,
        maxUses: discountData.maxUses,
        usedCount: discountData.usedCount,
        active: discountData.active,
      },
      message: "Discount code is valid",
    })
  } catch (error) {
    console.error("Error validating discount:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
