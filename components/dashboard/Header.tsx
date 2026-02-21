"use client"

import { Trophy } from "lucide-react"

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <Trophy className="h-6 w-6 text-[#FDB927]" />
        <h2 className="text-lg font-semibold">Los Angeles Lakers</h2>
        <span className="text-sm text-muted-foreground">•</span>
        <span className="text-sm text-muted-foreground">2025-26 Season</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </header>
  )
}
