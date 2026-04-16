'use client'

import { withAuth } from "@/app/hooks/useAuth"
import type { SessionUser } from "@/app/lib/auth-client-user"
import Refund from "./client"

interface RefundPageClientProps {
  user: SessionUser
}

function RefundPageClient({ user }: RefundPageClientProps) {
  return <Refund />
}

export default withAuth(RefundPageClient)
