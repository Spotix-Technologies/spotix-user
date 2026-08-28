// app/event/[eventId]/payment/lib/firebase-user.ts

import { auth } from "@/app/lib/firebase"
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth"

/**
 * Resolves once Firebase Auth has restored its persisted session (or
 * confirmed there is none). See EventPaymentClient's top-level comment on
 * /api/v1/iwss and /api/v1/create-pay-ref for why this is still needed
 * alongside the JWT session.
 */
export function waitForFirebaseUser(): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      unsubscribe()
      resolve(firebaseUser)
    })
  })
}
