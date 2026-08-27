import type { Metadata } from "next"
import QueueClient from "./QueueClient"

export const metadata: Metadata = {
  title: "You're in line",
  description: "Hang tight — you'll be let through to checkout shortly.",
  openGraph: {
    title: "You're in line",
    description: "Hang tight — you'll be let through to checkout shortly.",
    type: "website",
  },
}

export default function EventQueuePage() {
  return <QueueClient />
}
