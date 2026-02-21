"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BodyOutline } from "@/components/dashboard/BodyOutline"
import { players } from "@/lib/mockData"
import {
  computePredictionFromFeatures,
  performanceTrends,
} from "@/lib/analyticsData"
import { playerHistoryData } from "@/lib/playerHistoryData"
import { getPlayerBodyInjuryRegions } from "@/lib/playerBodyInjuryData"
import { ArrowLeft, AlertTriangle, Activity, Users } from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts"
import { useMemo } from "react"

export default function PlayerDashboardPage() {
  const params = useParams()
  const id = typeof params?.id === "string" ? params.id : null

  const player = useMemo(() => (id ? players.find((p) => p.id === id) : null), [id])

  const prediction = useMemo(() => {
    if (!player) return null
    const history = playerHistoryData.find((h) => h.name === player.name)
    const features = history
      ? {
          MIN_ROLLING_10: history.rollingMin?.length
            ? history.rollingMin.reduce((a, b) => a + b, 0) / history.rollingMin.length
            : history.minutesPerGame.year3,
          CONTACT_RATE: history.contactRate,
          AGE: history.age,
          INJURY_COUNT: history.injuries.length,
        }
      : {
          MIN_ROLLING_10: player.currentMinutes,
          CONTACT_RATE: player.contactIntensity / 10,
          AGE: player.age,
          INJURY_COUNT: player.injuryHistory.count,
        }
    return computePredictionFromFeatures(features, {
      position: player.position,
      usageRate: history?.usageRate?.year3,
    })
  }, [player])

  const bodyRegions = useMemo(
    () =>
      player && prediction
        ? getPlayerBodyInjuryRegions(
            player.id,
            prediction.predictedRisk,
            player.position,
            player.injuryHistory.count
          )
        : [],
    [player, prediction]
  )

  const chartData = useMemo(() => {
    if (!player) return []
    const historyTrends = performanceTrends.filter((t) => t.player === player.name)
    if (historyTrends.length > 0) {
      return historyTrends.slice(-20).map((t, i) => ({ game: i + 1, risk: t.riskScore }))
    }
    return player.trendData.map((value, index) => ({ game: index + 1, risk: value }))
  }, [player])

  const performanceTrendsForPlayer = useMemo(
    () => (player ? performanceTrends.filter((t) => t.player === player.name) : []),
    [player]
  )

  const allPlayerRisks = useMemo(() => {
    return players.map((p) => {
      const history = playerHistoryData.find((h) => h.name === p.name)
      const features = history
        ? {
            MIN_ROLLING_10: history.rollingMin?.length
              ? history.rollingMin.reduce((a, b) => a + b, 0) / history.rollingMin.length
              : history.minutesPerGame.year3,
            CONTACT_RATE: history.contactRate,
            AGE: history.age,
            INJURY_COUNT: history.injuries.length,
          }
        : {
            MIN_ROLLING_10: p.currentMinutes,
            CONTACT_RATE: p.contactIntensity / 10,
            AGE: p.age,
            INJURY_COUNT: p.injuryHistory.count,
          }
      const pred = computePredictionFromFeatures(features, {
        position: p.position,
        usageRate: history?.usageRate?.year3,
      })
      return { id: p.id, name: p.name, risk: pred.predictedRisk }
    })
  }, [])

  const teammateComparisons = useMemo(
    () =>
      player && id
        ? allPlayerRisks
            .filter((r) => r.id !== id)
            .map((teammate) => ({
              teammateName: teammate.name,
              teammateRisk: teammate.risk,
              yourRisk: prediction?.predictedRisk ?? 50,
            }))
        : [],
    [player, id, prediction?.predictedRisk, allPlayerRisks]
  )

  const modelRiskNum = prediction?.predictedRisk ?? 50
  const scatterData = useMemo(
    () =>
      players.map((p) => ({
        x: p.currentMinutes,
        y: p.id === id ? modelRiskNum : p.riskScore,
        z: p.age,
        name: p.name,
        isCurrent: p.id === id,
      })),
    [id, modelRiskNum]
  )

  if (!id || !player) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="pt-6">
                <p className="text-muted-foreground mb-4">Player not found.</p>
                <Button asChild variant="outline">
                  <Link href="/">Back to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  const modelRisk = modelRiskNum
  const riskClassification =
    modelRisk < 45 ? "Low" : modelRisk < 60 ? "Moderate" : "High"
  const getRiskBadgeVariant = (c: string) =>
    c === "Low" ? "success" : c === "High" ? "danger" : "warning"
  const getRiskColor = (risk: number) =>
    risk < 45 ? "text-green-500" : risk < 60 ? "text-yellow-500" : "text-red-500"
  const getRiskBarColor = (risk: number) =>
    risk < 45 ? "bg-green-500" : risk < 60 ? "bg-yellow-500" : "bg-red-500"

  const factors = prediction?.factors ?? []
  const recommendedAction = prediction?.recommendedAction ?? "No restrictions"

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/" aria-label="Back to dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{player.name}</h1>
                <p className="text-muted-foreground">
                  {player.position} · Age {player.age}
                </p>
              </div>
              <Badge variant={getRiskBadgeVariant(riskClassification)}>
                {riskClassification} Risk
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              Risk score from AI model (same as Analytics)
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Body outline – injury likelihood by region */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-[#FDB927]" />
                    Injury Risk by Body Region
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Based on AI model and current load data
                  </p>
                </CardHeader>
                <CardContent>
                  <BodyOutline regions={bodyRegions} />
                </CardContent>
              </Card>

              {/* Stats */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Stats & Load</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk Score (model)</span>
                    <span className={`text-2xl font-bold ${getRiskColor(modelRisk)}`}>
                      {modelRisk}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${getRiskBarColor(modelRisk)}`}
                      style={{ width: `${Math.min(100, modelRisk)}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    <div>
                      <div className="text-xs text-muted-foreground">Recommended min</div>
                      <div className="text-lg font-semibold">{player.recommendedMinutes}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Current avg min</div>
                      <div className="text-lg font-semibold">{player.currentMinutes}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Historical load</div>
                      <div className="text-lg font-semibold">{player.historicalLoad}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Game load</div>
                      <div className="text-lg font-semibold">{player.gameLoad}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Contact intensity</div>
                      <div className="text-lg font-semibold">{player.contactIntensity}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Injuries (history)</div>
                      <div className="text-lg font-semibold">{player.injuryHistory.count}</div>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border text-sm text-muted-foreground">
                    Last injury: {player.injuryHistory.lastInjury} · Recovery days:{" "}
                    {player.injuryHistory.recoveryDays.join(", ")}
                  </div>
                </CardContent>
              </Card>

              {/* Risk factors & recommendation (analytics-style) */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Key factors</p>
                    <div className="flex flex-wrap gap-2">
                      {factors.map((factor, i) => (
                        <Badge key={i} variant="outline">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium text-[#FDB927]">{recommendedAction}</p>
                  </div>
                  <div className="pt-2">
                    <p className="text-sm font-medium mb-2">Risk trend (from model when available)</p>
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                          <XAxis dataKey="game" hide />
                          <YAxis domain={["dataMin - 5", "dataMax + 5"]} width={28} />
                          <Tooltip />
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
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Trends (from analytics) */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {performanceTrendsForPlayer.length > 0
                    ? `Model-based trend for ${player.name}`
                    : "Risk trend (last 20 games)"}
                </p>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="risk">
                  <TabsList>
                    <TabsTrigger value="risk">Risk Score</TabsTrigger>
                    <TabsTrigger value="minutes">Minutes</TabsTrigger>
                    <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
                  </TabsList>
                  <TabsContent value="risk" className="mt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={
                          performanceTrendsForPlayer.length > 0
                            ? performanceTrendsForPlayer.slice(-30)
                            : chartData.map((d) => ({ date: `Game ${d.game}`, riskScore: d.risk }))
                        }
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis
                          dataKey={performanceTrendsForPlayer.length > 0 ? "date" : "date"}
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="riskScore"
                          stroke="#552583"
                          strokeWidth={2}
                          name="Risk Score"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  <TabsContent value="minutes" className="mt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={
                          performanceTrendsForPlayer.length > 0
                            ? performanceTrendsForPlayer.slice(-30)
                            : chartData.map((_, i) => ({
                                date: `Game ${i + 1}`,
                                minutes: player.currentMinutes,
                              }))
                        }
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="minutes" fill="#FDB927" name="Minutes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  <TabsContent value="efficiency" className="mt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={
                          performanceTrendsForPlayer.length > 0
                            ? performanceTrendsForPlayer.slice(-30).map((t) => ({
                                ...t,
                                efficiency: 0.5 + (100 - t.riskScore) / 200,
                              }))
                            : chartData.map((d) => ({
                                date: `Game ${d.game}`,
                                efficiency: 0.5 + (100 - d.risk) / 200,
                              }))
                        }
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="efficiency"
                          stroke="#552583"
                          strokeWidth={2}
                          name="Efficiency"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Player Comparisons – you vs each teammate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#FDB927]" />
                  Baseline Risk vs Teammates
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your injury risk (model) compared to each teammate
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teammateComparisons.map((c, idx) => {
                    const total = c.yourRisk + c.teammateRisk || 1
                    const yourPct = (c.yourRisk / total) * 100
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">Baseline injury risk</span>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-muted-foreground">You</div>
                              <div className="font-bold">{c.yourRisk.toFixed(1)}</div>
                            </div>
                            <span className="text-muted-foreground">vs</span>
                            <div className="text-left">
                              <div className="text-muted-foreground">{c.teammateName}</div>
                              <div className="font-bold">{c.teammateRisk.toFixed(1)}</div>
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${yourPct}%` }}
                          />
                          <div
                            className="h-full bg-[#FDB927] transition-all"
                            style={{ width: `${100 - yourPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Risk vs Minutes (from analytics) */}
            <Card>
              <CardHeader>
                <CardTitle>Risk vs Minutes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Team view — you are highlighted in gold
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Minutes"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Risk"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <ZAxis type="number" dataKey="z" range={[50, 400]} name="Age" />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (active && payload?.[0]) {
                          const d = payload[0].payload as { name: string; x: number; y: number; z: number; isCurrent?: boolean }
                          return (
                            <div className="rounded-lg border bg-card p-3 shadow-lg">
                              <p className="font-semibold">{d.name}{d.isCurrent ? " (you)" : ""}</p>
                              <p className="text-sm">Minutes: {d.x}</p>
                              <p className="text-sm">Risk: {d.y}</p>
                              <p className="text-sm">Age: {d.z}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Scatter
                      name="Teammates"
                      data={scatterData.filter((p) => !p.isCurrent)}
                      fill="#552583"
                      fillOpacity={0.7}
                    />
                    <Scatter
                      name="You"
                      data={scatterData.filter((p) => p.isCurrent)}
                      fill="#FDB927"
                      fillOpacity={1}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
