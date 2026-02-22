"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Activity, Clock, AlertTriangle, Shield, Users, TrendingUp } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts"
import { players } from "@/lib/mockData"
import { injuryPredictions, performanceTrends } from "@/lib/analyticsData"
import { playerHistoryData } from "@/lib/playerHistoryData"
import { BodyOutline } from "@/components/dashboard/BodyOutline"
import { getPlayerBodyRegionRisks } from "@/lib/playerBodyInjuryData"
import { cn } from "@/lib/utils"

export default function PlayerPage() {
  const params = useParams()
  const id = params.id as string

  const player = players.find((p) => p.id === id)
  const prediction = injuryPredictions.find(
    (p) => p.player.toLowerCase().replace(/\s+/g, "-") === id
  )
  const history = playerHistoryData.find(
    (p) => p.name.toLowerCase().replace(/\s+/g, "-") === id
  )

  if (!player) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold">Player Not Found</h2>
            <p className="text-muted-foreground">
              No player found with ID &quot;{id}&quot;
            </p>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Performance trend data for this player
  const playerTrends = performanceTrends
    .filter((pt) => pt.player === player.name)
    .map((pt, i) => ({
      game: i + 1,
      date: pt.date,
      riskScore: parseFloat(pt.riskScore.toFixed(2)),
      minutes: parseFloat(pt.minutes.toFixed(2)),
      efficiency: parseFloat(pt.efficiency.toFixed(2)),
    }))

  const chartTrends =
    playerTrends.length > 0
      ? playerTrends.slice(-20)
      : player.trendData.slice(-20).map((risk, i) => ({
          game: i + 1,
          date: "",
          riskScore: parseFloat(risk.toFixed(2)),
          minutes: parseFloat(player.currentMinutes.toFixed(2)),
          efficiency: parseFloat((0.5 + (100 - risk) / 200).toFixed(2)),
        }))

  // Body region risks
  const bodyRegions = getPlayerBodyRegionRisks(player.name)

  // Injury history
  const injuries = history?.injuries ?? []

  // Benchmark comparison: this player vs all teammates — sorted by risk descending for horizontal bars
  const benchmarkData = players
    .map((p) => ({
      name: p.name.split(" ").pop() ?? p.name,
      fullName: p.name,
      riskScore: parseFloat(p.riskScore.toFixed(2)),
      minutes: parseFloat(p.currentMinutes.toFixed(2)),
      isCurrent: p.id === player.id,
    }))
    .sort((a, b) => b.riskScore - a.riskScore)

  // Risk vs Minutes scatter data (team view)
  const scatterData = players.map((p) => ({
    name: p.name,
    shortName: p.name.split(" ").pop() ?? p.name,
    minutes: parseFloat(p.currentMinutes.toFixed(2)),
    risk: parseFloat(p.riskScore.toFixed(2)),
    isCurrent: p.id === player.id,
  }))

  const getRiskColor = (risk: number) => {
    if (risk < 45) return "text-green-500"
    if (risk < 65) return "text-amber-500"
    return "text-red-500"
  }

  const getRiskBadgeVariant = (classification: string) => {
    switch (classification) {
      case "Low":
        return "success" as const
      case "Moderate":
        return "warning" as const
      case "High":
        return "danger" as const
      default:
        return "default" as const
    }
  }

  const getActionStyle = (risk: number) => {
    if (risk >= 75) return "bg-red-500/15 border-red-500/30 text-red-400"
    if (risk >= 55) return "bg-amber-500/15 border-amber-500/30 text-amber-400"
    return "bg-green-500/15 border-green-500/30 text-green-400"
  }

  const minutesDiffer = player.currentMinutes !== player.recommendedMinutes

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{player.name}</h1>
            <p className="text-muted-foreground">{player.position}</p>
          </div>
          <Badge
            variant={getRiskBadgeVariant(player.riskClassification)}
            className="text-lg px-4 py-1"
          >
            {player.riskClassification} Risk
          </Badge>
        </div>

        {/* Key stats row — 3 cards, no Recommended MPG */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Activity className={cn("h-8 w-8 mx-auto mb-2", getRiskColor(player.riskScore))} />
              <div className="text-3xl font-bold text-white">
                {player.riskScore.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Risk Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-[#FDB927]" />
              <div className="text-3xl font-bold">{player.currentMinutes.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-1">Current MPG</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-[#552583]" />
              <div className="text-3xl font-bold">{history?.age ?? "—"}</div>
              <p className="text-sm text-muted-foreground mt-1">Age</p>
            </CardContent>
          </Card>
        </div>

        {/* Recommended Action banner */}
        {prediction && (
          <Card className={cn("border-2", getActionStyle(player.riskScore))}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
                    Recommended Action
                  </p>
                  <p className="text-base font-bold">{prediction.recommendedAction}</p>
                </div>
                {minutesDiffer && (
                  <div className="text-right">
                    <p className="text-xs opacity-80">Adjust minutes</p>
                    <p className="text-lg font-bold">
                      {player.currentMinutes.toFixed(2)} → {player.recommendedMinutes.toFixed(2)} MPG
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Body outline + AI risk assessment */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Injury Risk Map</CardTitle>
            </CardHeader>
            <CardContent>
              <BodyOutline regions={bodyRegions} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {prediction && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Risk Factors
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {prediction.factors.length > 0 ? (
                      prediction.factors.map((factor, i) => (
                        <Badge key={i} variant="outline">
                          {factor}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No major risk factors identified
                      </span>
                    )}
                  </div>
                </div>
              )}

              {injuries.length > 0 && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Injury History ({injuries.length} recorded)
                  </h3>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {injuries.map((injury: any, i: number) => {
                      const bodyPart: string =
                        injury.body_part ?? injury.bodyPart ?? injury.type ?? injury.description ?? injury.name ?? "Unknown"
                      const rawSeason: string = injury.season ?? injury.year ?? ""
                      // Extract only the season (e.g. "2023-24") — strip any date info
                      const season = rawSeason.replace(/\d{4}-\d{2}-\d{2}/g, "").trim()
                        || (rawSeason.match(/\d{4}/)?.[0] ?? "")
                      const gamesMissed: number | undefined = injury.gamesMissed ?? injury.games_missed
                      return (
                        <li key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md bg-muted/40">
                          <div className="flex flex-col">
                            <span className="font-medium capitalize">{bodyPart}</span>
                            {season && <span className="text-xs text-muted-foreground">{season}</span>}
                          </div>
                          <span className="text-muted-foreground">
                            {gamesMissed != null ? `${gamesMissed} games missed` : ""}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Benchmark Comparison: player vs teammates — horizontal bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#FDB927]" />
              Benchmark Comparison vs. Teammates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(300, benchmarkData.length * 44)}>
              <BarChart
                data={benchmarkData}
                layout="vertical"
                margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 13, fontWeight: 500 }}
                  width={90}
                />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload?.length) {
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-card p-3 shadow-lg">
                          <p className="font-semibold mb-1">{d.fullName}</p>
                          <p className="text-sm">Risk Score: {d.riskScore.toFixed(2)}</p>
                          <p className="text-sm">Minutes: {d.minutes.toFixed(2)}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="riskScore" radius={[0, 6, 6, 0]} name="Risk Score" barSize={28}>
                  {benchmarkData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.isCurrent ? "#552583" : "#FDB927"}
                      opacity={entry.isCurrent ? 1 : 0.75}
                      stroke={entry.isCurrent ? "#552583" : "none"}
                      strokeWidth={entry.isCurrent ? 2 : 0}
                    />
                  ))}
                  <LabelList
                    dataKey="riskScore"
                    position="right"
                    formatter={(v: number) => `${v.toFixed(1)}%`}
                    style={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded" style={{ backgroundColor: "#552583" }} />
                {player.name} (You)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded" style={{ backgroundColor: "#FDB927", opacity: 0.75 }} />
                Teammates
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Risk vs Minutes scatter (team view) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#552583]" />
              Risk vs. Minutes (Team View)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={380}>
              <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="minutes"
                  name="Minutes"
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                  label={{ value: "Minutes Per Game", position: "insideBottom", offset: -15, style: { fill: "hsl(var(--muted-foreground))", fontSize: 12 } }}
                  domain={["dataMin - 3", "dataMax + 3"]}
                />
                <YAxis
                  dataKey="risk"
                  name="Risk"
                  type="number"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                  domain={[0, 100]}
                  label={{ value: "Risk Score", angle: -90, position: "insideLeft", offset: -5, style: { fill: "hsl(var(--muted-foreground))", fontSize: 12 } }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }: any) => {
                    if (active && payload?.length) {
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-card p-3 shadow-lg">
                          <p className="font-semibold mb-1">{d.name}</p>
                          <p className="text-sm">Risk: {d.risk.toFixed(2)}</p>
                          <p className="text-sm">Minutes: {d.minutes.toFixed(2)}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter
                  data={scatterData.filter((d) => !d.isCurrent)}
                  fill="#552583"
                  opacity={0.7}
                  name="Teammates"
                />
                <Scatter
                  data={scatterData.filter((d) => d.isCurrent)}
                  fill="#FDB927"
                  name={player.name}
                  shape={(props: any) => {
                    const { cx, cy } = props
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={10} fill="#FDB927" stroke="#FDB927" strokeWidth={3} opacity={0.9} />
                        <circle cx={cx} cy={cy} r={16} fill="none" stroke="#FDB927" strokeWidth={1.5} opacity={0.4} />
                      </g>
                    )
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: 10 }}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Trends — last 20 games chart + table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#FDB927]" />
              Performance Trends (Last {chartTrends.length} Games)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="game" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" domain={[0, 100]} />
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload?.length) {
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-card p-3 shadow-lg">
                          <p className="font-semibold mb-1">Game {d.game}</p>
                          {d.date && <p className="text-xs text-muted-foreground mb-1">{d.date}</p>}
                          <p className="text-sm">Risk: {d.riskScore.toFixed(2)}</p>
                          <p className="text-sm">Efficiency: {d.efficiency.toFixed(2)}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Line type="monotone" dataKey="riskScore" stroke="#552583" strokeWidth={2} name="Risk Score" dot={{ fill: "#552583", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>

            {/* Game-by-game table */}
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">Game</th>
                    {chartTrends[0]?.date && (
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                    )}
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Risk</th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {chartTrends.map((g) => (
                    <tr key={g.game} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3">{g.game}</td>
                      {g.date && <td className="py-2 px-3 text-muted-foreground">{g.date}</td>}
                      <td className={cn("py-2 px-3 text-right font-semibold tabular-nums",
                        g.riskScore < 45 ? "text-green-500" : g.riskScore < 65 ? "text-amber-500" : "text-red-500"
                      )}>
                        {g.riskScore.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{g.efficiency.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
