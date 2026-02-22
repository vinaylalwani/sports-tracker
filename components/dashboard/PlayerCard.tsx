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

  const riskColor =
    player.riskScore < 45
      ? "bg-green-500"
      : player.riskScore < 65
      ? "bg-amber-500"
      : "bg-red-500"

  const riskTextColor =
    player.riskScore < 45
      ? "text-green-500"
      : player.riskScore < 65
      ? "text-amber-500"
      : "text-red-500"

  const minutesDelta = parseFloat(
    (player.recommendedMinutes - player.currentMinutes).toFixed(2)
  )

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
        {/* Risk score with visual gauge */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className={cn("text-3xl font-bold", riskTextColor)}>
              {player.riskScore.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", riskColor)}
              style={{ width: `${Math.min(player.riskScore, 100)}%` }}
            />
          </div>
        </div>

        {/* Recommended play time */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-muted-foreground text-xs">Recommended</div>
            <div
              className={cn(
                "text-lg font-semibold",
                player.recommendedMinutes < player.currentMinutes
                  ? "text-amber-400"
                  : "text-green-400"
              )}
            >
              {player.recommendedMinutes.toFixed(2)} min
            </div>
          </div>
          {minutesDelta !== 0 && (
            <div className="text-right">
              <div className="text-muted-foreground text-xs">vs Current</div>
              <div
                className={cn(
                  "text-sm font-semibold",
                  minutesDelta < 0 ? "text-amber-400" : "text-green-400"
                )}
              >
                {minutesDelta > 0 ? "+" : ""}
                {minutesDelta.toFixed(2)} min
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
