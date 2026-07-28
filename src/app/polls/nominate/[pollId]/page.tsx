import type { Metadata } from "next"
import { Suspense } from "react"
import NominateClient from "./nominateClient"
import UserHeader from "@/components/UserHeader"
import Footer from "@/components/footer"

interface Props {
  params: Promise<{ pollId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pollId } = await params
  return {
    title: "Nominations",
    description: "Nominate a candidate for this open-nomination poll on Spotix.",
    alternates: { canonical: `/polls/nominate/${pollId}` },
  }
}

export default async function NominatePage({ params }: Props) {
  const { pollId } = await params

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <UserHeader />
      <Suspense fallback={<div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-[#6b2fa5] border-t-transparent rounded-full animate-spin" /></div>}>
        <NominateClient pollId={pollId} />
      </Suspense>
      <Footer />
    </div>
  )
}
