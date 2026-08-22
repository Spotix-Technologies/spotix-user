import type { Metadata } from "next"
import EventPaymentClient from "./EventPaymentClient"

export const metadata: Metadata = {
  title: "Payment",
  description: "Choose your payment method for event tickets on Spotix",
  openGraph: {
    title: "Payment",
    description: "Choose your payment method for event tickets on Spotix",
    type: "website",
  },
}

export default function EventPaymentPage() {
  return <EventPaymentClient />
}
