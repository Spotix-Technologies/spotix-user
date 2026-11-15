"use client"

import { usePathname, useRouter } from "next/navigation"

/** Labelled log-in pill for the hero; remembers where to return after login. */
export default function HeroAuthAction() {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogin = () => {
    sessionStorage.setItem("redirectAfterLogin", pathname + window.location.search)
    router.push("/auth/login")
  }

  return (
    <button
      type="button"
      onClick={handleLogin}
      className="rounded-full bg-white px-6 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white/90 active:scale-95"
    >
      Log in
    </button>
  )
}
