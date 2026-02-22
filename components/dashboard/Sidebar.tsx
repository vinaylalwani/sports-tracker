"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Video, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Video Analysis", href: "/video", icon: Video },
  { name: "Schedule", href: "/schedule", icon: Calendar },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r border-border/80 bg-black">
      <div className="flex h-16 items-center border-b border-border/80 px-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#6B3FA0] via-[#552583] to-[#E8B020] bg-clip-text text-transparent">
          CourtsideIQ
        </h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border p-4">
        <div className="text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">Los Angeles Lakers</div>
          <div className="mt-1">2025-26 Season</div>
        </div>
      </div>
    </div>
  )
}
