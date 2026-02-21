"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react"

export function MinutesSimulator() {
  const [minutes, setMinutes] = useState([32])

  // Simulate risk calculation based on minutes
  const calculateRisk = (mins: number) => {
    // Base risk increases with minutes, but not linearly
    const baseRisk = 50
    const minuteFactor = (mins - 20) * 1.5
    const risk = Math.min(100, baseRisk + minuteFactor)
    return Math.round(risk)
  }

  const currentRisk = calculateRisk(minutes[0])
  const recommendedMinutes = minutes[0] > 35 ? 32 : minutes[0] < 25 ? 28 : minutes[0]

  const getRiskColor = (risk: number) => {
    if (risk < 50) return "text-green-500"
    if (risk < 75) return "text-yellow-500"
    return "text-red-500"
  }

  const getRiskBadgeVariant = (risk: number): "success" | "warning" | "danger" => {
    if (risk < 50) return "success"
    if (risk < 75) return "warning"
    return "danger"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[#FDB927]" />
          Minutes Optimization Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">What if player plays</span>
            <span className="text-2xl font-bold text-[#552583]">{minutes[0]} min</span>
            <span className="text-sm font-medium">next game?</span>
          </div>
          <Slider
            value={minutes}
            onValueChange={setMinutes}
            min={20}
            max={42}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>20 min</span>
            <span>31 min</span>
            <span>42 min</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Predicted Risk</div>
            <div className={`text-3xl font-bold ${getRiskColor(currentRisk)}`}>
              {currentRisk}%
            </div>
            <Badge variant={getRiskBadgeVariant(currentRisk)} className="mt-2">
              {currentRisk < 50 ? "Low" : currentRisk < 75 ? "Moderate" : "High"}
            </Badge>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Recommended Minutes</div>
            <div className="text-3xl font-bold text-[#FDB927]">
              {recommendedMinutes} min
            </div>
            <Badge variant="outline" className="mt-2">
              Optimal Range
            </Badge>
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Risk Gauge</span>
          </div>
          <div className="relative h-8 bg-muted rounded-full overflow-hidden">
            <div
              className={`absolute h-full transition-all duration-300 ${
                currentRisk < 50
                  ? "bg-green-500"
                  : currentRisk < 75
                  ? "bg-yellow-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${currentRisk}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
              {currentRisk}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
