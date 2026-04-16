'use client'

import { withAuth } from "@/app/hooks/useAuth"
import type { SessionUser } from "@/app/lib/auth-client-user"
import Home from "./client"

interface HomePageClientProps {
  user: SessionUser
}

function HomePageClient({ user }: HomePageClientProps) {
  return <Home />
}

export default withAuth(HomePageClient)
