import type { Metadata } from "next"
import QueueClient from "./QueueClient"

export const metadata: Metadata = {
  title: "You're in line",
  description: "Just chill, we will check you in soon.",
  openGraph: {
    title: "You're in line",
    description: "Relax, you're just on a queue...",
    type: "website",
  },
}

export default function EventQueuePage() {
  return <QueueClient />
}
