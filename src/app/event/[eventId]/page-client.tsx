'use client'

import { withAuth } from "@/app/hooks/useAuth"
import type { SessionUser } from "@/app/lib/auth-client-user"
import ClientPage from "./ClientPage"
import type { EventType } from "./page"

interface EventPageClientProps {
  params: { createdBy: string; eventId: string }
  initialEventData: EventType | null
  user: SessionUser
}

function EventPageClientWrapper({
  params,
  initialEventData,
  user,
}: EventPageClientProps) {
  return <ClientPage params={params} initialEventData={initialEventData} />
}

export default withAuth(EventPageClientWrapper)
