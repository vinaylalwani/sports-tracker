"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, ResponsiveContainer } from "recharts"
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

  const chartData = player.trendData.map((value, index) => ({
    game: index + 1,
    risk: value,
  }))

  return (
    <Card className="hover:shadow-xl transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              <Link
                href={`/players/${player.id}`}
                className={cn(
                  "hover:underline hover:text-[#FDB927] focus:outline-none focus:ring-2 focus:ring-[#FDB927] focus:ring-offset-2 focus:ring-offset-background rounded"
                )}
              >
                {player.name}
              </Link>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{player.position}</p>
          </div>
          <Badge variant={getRiskBadgeVariant(player.riskClassification)}>
            {player.riskClassification}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{player.riskScore}</span>
          <span className="text-sm text-muted-foreground">Risk Score</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Recommended</div>
            <div className="text-lg font-semibold">{player.recommendedMinutes} min</div>
          </div>
          <div>
            <div className="text-muted-foreground">Current Avg</div>
            <div className="text-lg font-semibold">{player.currentMinutes} min</div>
          </div>
        </div>
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="risk"
                stroke="#552583"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
