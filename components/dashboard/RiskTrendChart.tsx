"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts"
import { RiskTrendData, teamBaselineRisk, teamAvgMinutes } from "@/lib/mockData"
import { projectDynamicRisk } from "@/lib/riskProjection"
import type { Game } from "@/lib/scheduleData"

interface RiskTrendChartProps {
  data: RiskTrendData[]
}

export function RiskTrendChart({ data: fallbackData }: RiskTrendChartProps) {
  const [data, setData] = useState<RiskTrendData[]>(fallbackData)
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    async function fetchAndProject() {
      try {
        const res = await fetch("/api/schedule")
        if (res.ok) {
          const json = await res.json()
          if (json.games && json.games.length > 0) {
            const liveGames: Game[] = json.games.slice(0, 8)
            const projected = projectDynamicRisk(
              liveGames,
              teamBaselineRisk,
              teamAvgMinutes
            )
            setData(projected)
            setIsLive(true)
          }
        }
      } catch {
        // Keep fallback data
      } finally {
        setLoading(false)
      }
    }
    fetchAndProject()
  }, [])

  const baseline = data.length > 0 ? data[0].baselineRisk : 0

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div className="rounded-lg border bg-card p-3 shadow-lg">
          <p className="font-semibold mb-1">
            Game {d.game}{d.opponent ? ` — ${d.opponent}` : ""}
          </p>
          {d.date && (
            <p className="text-xs text-muted-foreground mb-1">
              {d.date} · {d.location ?? ""}
            </p>
          )}
          <p className="text-sm" style={{ color: "#FDB927" }}>
            Dynamic Risk: {d.dynamicRisk.toFixed(2)}
          </p>
          <p className="text-sm">Baseline Risk: {d.baselineRisk.toFixed(2)}</p>
          <p className="text-sm">Minutes: {d.minutes.toFixed(2)}</p>
          <p className="text-sm">Schedule Stress: {d.scheduleStress.toFixed(2)}x</p>
          <p className="text-sm">Game Load Score: {d.gameLoadScore.toFixed(2)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Projected Dynamic Risk (Next {data.length} Games)
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {isLive && (
            <Badge variant="outline" className="text-[10px] ml-auto">LIVE</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="game"
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v) => {
                const pt = data.find((d) => d.game === v)
                if (pt?.opponent) {
                  const short = pt.opponent.split(" ").pop() ?? `G${v}`
                  return short
                }
                return `G${v}`
              }}
              tick={{ fontSize: 11 }}
            />
            <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <ReferenceLine
              y={baseline}
              stroke="#552583"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: `Baseline ${baseline.toFixed(1)}`,
                position: "insideTopRight",
                style: { fill: "#552583", fontSize: 11 },
              }}
            />
            <Line
              type="monotone"
              dataKey="dynamicRisk"
              stroke="#FDB927"
              strokeWidth={2.5}
              name="Dynamic Risk"
              dot={{ fill: "#FDB927", r: 5, strokeWidth: 2, stroke: "#FDB927" }}
              activeDot={{ r: 7, stroke: "#FDB927", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
