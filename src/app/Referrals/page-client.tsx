'use client'

import { withAuth } from "@/app/hooks/useAuth"
import type { SessionUser } from "@/app/lib/auth-client-user"
import ReferralsClient from "./client"

interface ReferralsPageClientProps {
  user: SessionUser
}

function ReferralsPageClient({ user }: ReferralsPageClientProps) {
  return <ReferralsClient user={user} />
}

export default withAuth(ReferralsPageClient)
