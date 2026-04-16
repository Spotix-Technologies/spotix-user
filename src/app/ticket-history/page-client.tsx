'use client'

import { withAuth } from "@/app/hooks/useAuth"
import type { SessionUser } from "@/app/lib/auth-client-user"
import TicketHistoryClient from "./client"

interface TicketHistoryPageClientProps {
  user: SessionUser
}

function TicketHistoryPageClient({ user }: TicketHistoryPageClientProps) {
  return <TicketHistoryClient />
}

export default withAuth(TicketHistoryPageClient)
