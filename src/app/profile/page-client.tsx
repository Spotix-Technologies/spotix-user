'use client'

import { withAuth } from "@/app/hooks/useAuth"
import type { SessionUser } from "@/app/lib/auth-client-user"
import Profile from "./client"

interface ProfilePageClientProps {
  user: SessionUser
}

function ProfilePageClient({ user }: ProfilePageClientProps) {
  return <Profile user={user} />
}

export default withAuth(ProfilePageClient)
