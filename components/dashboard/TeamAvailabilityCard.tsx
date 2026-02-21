"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Shield, TrendingUp, Target } from "lucide-react"

export function TeamAvailabilityCard() {
  const averageRisk = 57.6
  const projectedAvailability = 85
  const playoffReadiness = 78

  return (
    <Card className="bg-gradient-to-br from-[#552583]/20 to-[#FDB927]/10 border-[#552583]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#FDB927]" />
          Team Availability Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Average Team Risk</span>
            <span className="font-semibold">{averageRisk.toFixed(1)}</span>
          </div>
          <Progress value={averageRisk} className="h-2" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Projected Availability
            </span>
            <span className="font-semibold">{projectedAvailability}%</span>
          </div>
          <Progress value={projectedAvailability} className="h-2" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Playoff Readiness
            </span>
            <span className="font-semibold">{playoffReadiness}%</span>
          </div>
          <Progress value={playoffReadiness} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}
