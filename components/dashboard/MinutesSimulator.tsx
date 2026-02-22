"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react"
import { players } from "@/lib/mockData"
import { playerHistoryData } from "@/lib/playerHistoryData"
import { cn } from "@/lib/utils"

export function MinutesSimulator() {
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id ?? "")
  const [simMinutes, setSimMinutes] = useState<number | null>(null)

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId)
  const selectedHistory = playerHistoryData.find(
    (ph) => ph.name.toLowerCase().replace(/\s+/g, "-") === selectedPlayerId
  )

  const currentMin = selectedPlayer?.currentMinutes ?? 30
  const activeMinutes = simMinutes ?? currentMin

  const { baseRisk, simRisk, riskDelta, classification } = useMemo(() => {
    if (!selectedHistory || !selectedPlayer) {
      return {
        baseRisk: 50,
        simRisk: 50,
        riskDelta: 0,
        classification: "Moderate" as const,
      }
    }

    const baseMinutes = selectedHistory.rollingMin?.length
      ? selectedHistory.rollingMin.reduce((a, b) => a + b, 0) / selectedHistory.rollingMin.length
      : selectedHistory.minutesPerGame.year3

    const baseRisk = selectedPlayer.riskScore

    const minutesDiff = activeMinutes - baseMinutes
    const sensitivity = 0.4 + (baseRisk / 200)
    const rawDelta = minutesDiff * sensitivity

    const simRisk = parseFloat(Math.min(Math.max(baseRisk + rawDelta, 0), 100).toFixed(2))
    const riskDelta = parseFloat((simRisk - baseRisk).toFixed(2))
    const classification = simRisk < 45 ? "Low" : simRisk < 65 ? "Moderate" : "High"

    return { baseRisk, simRisk, riskDelta, classification }
  }, [selectedPlayer, selectedHistory, activeMinutes])

  const getRiskBadgeVariant = (c: string) => {
    switch (c) {
      case "Low": return "success" as const
      case "Moderate": return "warning" as const
      case "High": return "danger" as const
      default: return "default" as const
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-[#FDB927]" />
          Player Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Player selector — native select for reliability */}
        <div className="space-y-2">
          <label htmlFor="player-select" className="text-sm font-medium text-muted-foreground">
            Select Player
          </label>
          <select
            id="player-select"
            value={selectedPlayerId}
            onChange={(e) => {
              setSelectedPlayerId(e.target.value)
              setSimMinutes(null)
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.position}
              </option>
            ))}
          </select>
        </div>

        {selectedPlayer && (
          <>
            {/* Current vs simulated */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Current Risk</p>
                <p className={cn(
                  "text-2xl font-bold",
                  baseRisk < 45 ? "text-green-500" : baseRisk < 65 ? "text-amber-500" : "text-red-500"
                )}>
                  {baseRisk.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{currentMin.toFixed(1)} MPG</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Simulated Risk</p>
                <p className={cn(
                  "text-2xl font-bold",
                  simRisk < 45 ? "text-green-500" : simRisk < 65 ? "text-amber-500" : "text-red-500"
                )}>
                  {simRisk.toFixed(2)}
                </p>
                <Badge variant={getRiskBadgeVariant(classification)} className="mt-1">
                  {classification}
                </Badge>
              </div>
            </div>

            {/* Delta indicator */}
            <div className="flex items-center justify-center gap-2 py-1">
              {riskDelta < -0.5 ? (
                <>
                  <TrendingDown className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-semibold text-green-500">
                    Risk reduced by {Math.abs(riskDelta).toFixed(2)}
                  </span>
                </>
              ) : riskDelta > 0.5 ? (
                <>
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  <span className="text-sm font-semibold text-red-500">
                    Risk increased by {riskDelta.toFixed(2)}
                  </span>
                </>
              ) : (
                <>
                  <Minus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">No significant change</span>
                </>
              )}
            </div>

            {/* Minutes slider */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Simulated Minutes</span>
                <span className="font-bold text-lg">{activeMinutes.toFixed(1)} MPG</span>
              </div>
              <Slider
                value={[activeMinutes]}
                onValueChange={([val]) => setSimMinutes(val)}
                min={0}
                max={48}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 min</span>
                <span>48 min</span>
              </div>
            </div>

            {/* Recommendation */}
            {selectedPlayer.recommendedMinutes !== currentMin && (
              <div className="rounded-lg border border-[#FDB927]/30 bg-[#FDB927]/5 px-3 py-2 text-xs">
                <p className="text-muted-foreground">
                  AI recommends <span className="font-bold text-[#FDB927]">{selectedPlayer.recommendedMinutes.toFixed(2)} MPG</span> for {selectedPlayer.name} (currently {currentMin.toFixed(2)}).
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
