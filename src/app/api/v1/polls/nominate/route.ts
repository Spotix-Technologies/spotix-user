/**
 * src/app/api/v1/polls/nominate/route.ts
 *
 * POST /api/v1/polls/nominate
 * Body: { pollId, categoryId, name, deviceId }
 *
 * Public — anyone can nominate anyone into an open category. Guards:
 *   1. Rate limit: 8 submissions / min / IP (Redis, fails open if Redis is down)
 *   2. One nomination per category per device (deviceId, persisted client-side)
 *   3. One nomination per category per IP (hashed, server-side — harder to
 *      bypass than deviceId alone since localStorage can be cleared)
 *
 * The nominated name is normalised (trim + lowercase + collapsed
 * whitespace) for de-duplication: nominating "John Doe" and "john  doe"
 * both increment the same nominee's count. displayName keeps the casing
 * of whoever nominated that name first.
 */

import { NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/app/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { checkRateLimit, cacheDel } from "@/app/lib/redis"
import { getRequestIp, hashIp } from "@/app/lib/request-ip"
import {
  normalizeNomineeName,
  nomineeDocId,
  MIN_NOMINEE_NAME_LENGTH,
  MAX_NOMINEE_NAME_LENGTH,
} from "@/app/lib/nomination-config"

const RATE_LIMIT_PER_MINUTE = 8

export async function POST(req: NextRequest) {
  const ip = getRequestIp(req)

  // ── 1. Rate limit ────────────────────────────────────────────────────────
  const { allowed } = await checkRateLimit(`rl:nominate:${ip}`, RATE_LIMIT_PER_MINUTE)
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many nominations from this connection. Please slow down and try again shortly." },
      { status: 429 }
    )
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { pollId, categoryId, name, deviceId } = body

  if (!pollId?.trim())     return NextResponse.json({ error: "pollId is required" }, { status: 400 })
  if (!categoryId?.trim()) return NextResponse.json({ error: "categoryId is required" }, { status: 400 })
  if (!deviceId?.trim())   return NextResponse.json({ error: "deviceId is required" }, { status: 400 })

  const trimmedName = String(name ?? "").trim()
  if (trimmedName.length < MIN_NOMINEE_NAME_LENGTH || trimmedName.length > MAX_NOMINEE_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Name must be between ${MIN_NOMINEE_NAME_LENGTH} and ${MAX_NOMINEE_NAME_LENGTH} characters` },
      { status: 400 }
    )
  }

  try {
    const pollRef = adminDb.collection("nominationPolls").doc(pollId)
    const pollSnap = await pollRef.get()
    if (!pollSnap.exists) return NextResponse.json({ error: "Nomination poll not found" }, { status: 404 })

    const pollData = pollSnap.data()!
    if (pollData.status !== "active") {
      return NextResponse.json({ error: "Nominations are closed for this poll" }, { status: 409 })
    }
    const categories: { categoryId: string }[] = pollData.categories ?? []
    if (!categories.some((c) => c.categoryId === categoryId)) {
      return NextResponse.json({ error: "Category not found on this poll" }, { status: 404 })
    }

    const ipHash = hashIp(ip)
    const deviceLogRef = pollRef.collection("deviceLog").doc(`${categoryId}__device__${deviceId}`)
    const ipLogRef = pollRef.collection("deviceLog").doc(`${categoryId}__ip__${ipHash}`)
    const normalizedName = normalizeNomineeName(trimmedName)
    const nomineeRef = pollRef.collection("nominees").doc(nomineeDocId(categoryId, normalizedName))

    const result = await adminDb.runTransaction(async (tx) => {
      const [deviceLogSnap, ipLogSnap, nomineeSnap] = await Promise.all([
        tx.get(deviceLogRef),
        tx.get(ipLogRef),
        tx.get(nomineeRef),
      ])

      if (deviceLogSnap.exists || ipLogSnap.exists) {
        return { alreadyNominated: true }
      }

      const now = FieldValue.serverTimestamp()

      if (nomineeSnap.exists) {
        tx.update(nomineeRef, { count: FieldValue.increment(1), updatedAt: now })
      } else {
        tx.set(nomineeRef, {
          categoryId,
          name: normalizedName,
          displayName: trimmedName,
          count: 1,
          createdAt: now,
          updatedAt: now,
        })
      }

      tx.set(deviceLogRef, { categoryId, deviceId, nominee: normalizedName, createdAt: now })
      tx.set(ipLogRef, { categoryId, ipHash, nominee: normalizedName, createdAt: now })

      return { alreadyNominated: false }
    })

    if (result.alreadyNominated) {
      return NextResponse.json(
        { error: "You've already nominated someone in this category" },
        { status: 409 }
      )
    }

    // Invalidate the cached nominee list so this submission shows up immediately.
    await cacheDel(`nominees:${pollId}:${categoryId}`)

    return NextResponse.json({ success: true, message: "Nomination recorded" }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/v1/polls/nominate] error:", err)
    return NextResponse.json({ error: "Failed to record nomination" }, { status: 500 })
  }
}
