'use client'

import { useAuth } from "@/app/hooks/useAuth"
import Home from "./client"

export default function HomePageClient() {
  const { user, isLoading } = useAuth()

  // Don't block rendering — pass user if available, null if not
  return <Home user={isLoading ? null : user} />
}