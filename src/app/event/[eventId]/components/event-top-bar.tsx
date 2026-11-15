"use client"

import Link from "next/link"
import { Flag, Wallet } from "lucide-react"
import LoginButton from "@/components/LoginButton"
import { formatNumber } from "@/utils/formatter"

interface EventTopBarProps {
  eventName: string
  authChecked: boolean
  isAuthenticated: boolean
  walletBalance: number
  onReport: () => void
}

const glass =
  "flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-sm text-white backdrop-blur-md transition-colors"

/** Breadcrumb on the left, wallet / report / login on the right — sits on top of the dark hero. */
export function EventTopBar({ eventName, authChecked, isAuthenticated, walletBalance, onReport }: EventTopBarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
        <ol className="flex items-center gap-1.5 text-white/60">
          <li>
            <Link href="/home" className="transition-colors hover:text-white">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="max-w-[40vw] truncate font-medium text-white sm:max-w-md" aria-current="page">
            {eventName}
          </li>
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        {!authChecked ? (
          <div className="h-9 w-28 animate-pulse rounded-full bg-white/10" />
        ) : (
          <>
            {isAuthenticated && (
              <div className={glass}>
                <Wallet size={16} className="text-purple-300" />
                <span className="font-semibold">₦{formatNumber(walletBalance)}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onReport}
              aria-label="Report this event"
              className={`${glass} group hover:border-red-300/40 hover:bg-red-500/20`}
            >
              <Flag size={16} className="text-white/70 group-hover:text-red-200" />
              <span className="hidden font-medium sm:inline">Report</span>
            </button>
            {!isAuthenticated && <LoginButton />}
          </>
        )}
      </div>
    </div>
  )
}
