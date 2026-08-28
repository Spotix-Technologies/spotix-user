import type { Metadata } from "next"
import { Suspense } from "react"
import EventPaymentClient from "./EventPaymentClient"
import LoadingScreen from "./components/LoadingScreen"

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
  // EventPaymentClient reads `?ref=` via useSearchParams (payment
  // recovery — see lib/payment-status.ts), which requires a Suspense
  // boundary around it in the app router.
  return (
    <Suspense fallback={<LoadingScreen />}>
      <EventPaymentClient />
    </Suspense>
  )
}
