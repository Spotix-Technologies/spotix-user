// app/event/[eventId]/payment/hooks/useUserSession.ts
"use client"

import { useEffect, useState } from "react"
import { getSessionUser, type SessionUser } from "@/app/lib/auth-client-user"
import { fetchUserProfile, fetchWalletBalance } from "../lib/api"
import type { UserData } from "../types"

/**
 * Resolves who's checking out (or confirms it's a guest) and, for
 * logged-in buyers, their profile + wallet balance. Note: this hook does
 * NOT own the page's overall `dataLoading` flag — that's driven by the
 * payment-data/recovery loading in EventPaymentClient, same as the
 * original component (guests never had a session to wait on here).
 */
export function useUserSession() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [userData, setUserDataState] = useState<UserData | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const sessionUser = await getSessionUser()
      if (cancelled) return

      if (sessionUser) {
        setUser(sessionUser)
        const [profile, balance] = await Promise.all([fetchUserProfile(), fetchWalletBalance()])
        if (cancelled) return
        if (profile) setUserDataState(profile)
        setWalletBalance(balance)
      } else {
        // Allow guest checkout — don't force redirect
        setUser(null)
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  return { user, userData, setUserData: setUserDataState, walletBalance }
}
