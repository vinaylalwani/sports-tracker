"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Shield, TrendingUp, Target } from "lucide-react"
import { injuryPredictions } from "@/lib/analyticsData"

export function TeamAvailabilityCard() {
  // Compute average risk from the ML model predictions
  const averageRisk = parseFloat(
    (
      injuryPredictions.reduce((sum, p) => sum + p.predictedRisk, 0) /
      (injuryPredictions.length || 1)
    ).toFixed(2)
  )

  // Projected availability: inverse of average risk (players available %)
  const projectedAvailability = parseFloat((100 - averageRisk * 0.4).toFixed(2))

  // NOTE: Playoff readiness has NO backend data source.
  // Using a heuristic: weighted by how many players are below 50 risk.
  const lowRiskCount = injuryPredictions.filter((p) => p.predictedRisk < 50).length
  const playoffReadiness = parseFloat(
    ((lowRiskCount / (injuryPredictions.length || 1)) * 100).toFixed(2)
  )

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
            <span className="font-semibold">{averageRisk.toFixed(2)}</span>
          </div>
          <Progress value={averageRisk} className="h-2" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Projected Availability
            </span>
            <span className="font-semibold">{projectedAvailability.toFixed(2)}%</span>
          </div>
          <Progress value={projectedAvailability} className="h-2" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Playoff Readiness
            </span>
            <span className="font-semibold">{playoffReadiness.toFixed(2)}%</span>
          </div>
          <Progress value={playoffReadiness} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}
