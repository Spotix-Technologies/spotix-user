// components/McpGreetingBanner.tsx
"use client"

import { Bot } from "lucide-react"

export default function McpGreetingBanner({ firstName }: { firstName: string }) {
  return (
    <div className="flex items-start gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3.5">
      <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <p className="text-sm text-purple-900 leading-relaxed">
        <span className="font-semibold">Hi {firstName},</span> you&apos;re completing a purchase using the Spotix
        MCP Server. Here&apos;s a summary of your order:
      </p>
    </div>
  )
}
