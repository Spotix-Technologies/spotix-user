'use client'

import { withAuth } from "@/app/hooks/useAuth"
import type { SessionUser } from "@/app/lib/auth-client-user"
import RefundTrack from "./client"

interface RefundTrackPageClientProps {
  user: SessionUser
}

function RefundTrackPageClient({ user }: RefundTrackPageClientProps) {
  return <RefundTrack />
}

export default withAuth(RefundTrackPageClient)
