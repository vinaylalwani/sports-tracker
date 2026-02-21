"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Player } from "@/lib/mockData"
import { cn } from "@/lib/utils"

interface PlayerCardProps {
  player: Player
}

export function PlayerCard({ player }: PlayerCardProps) {
  const getRiskBadgeVariant = (classification: string) => {
    switch (classification) {
      case "Low":
        return "success"
      case "Moderate":
        return "warning"
      case "High":
        return "danger"
      default:
        return "default"
    }
  }

  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/players/${player.id}`}
              className={cn(
                "text-lg font-semibold leading-tight min-w-0 truncate",
                "hover:underline hover:text-[#FDB927] focus:outline-none focus:ring-2 focus:ring-[#FDB927] focus:ring-offset-2 focus:ring-offset-background rounded"
              )}
              title={player.name}
            >
              {player.name}
            </Link>
            <Badge
              variant={getRiskBadgeVariant(player.riskClassification)}
              className="shrink-0"
            >
              {player.riskClassification}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{player.position}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{player.riskScore.toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">Risk Score</span>
        </div>
        <div>
          <div className="text-muted-foreground text-sm">Recommended Play Time</div>
          <div
            className={cn(
              "text-xl font-semibold",
              player.recommendedMinutes < player.currentMinutes
                ? "text-amber-400"
                : "text-green-400"
            )}
          >
            {player.recommendedMinutes.toFixed(2)} min
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
