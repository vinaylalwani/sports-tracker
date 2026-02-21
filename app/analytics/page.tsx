"use client"

import { useState } from "react"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { TrendingUp, TrendingDown, AlertTriangle, Users, Activity } from "lucide-react"
import { players, riskTrendData } from "@/lib/mockData"
import { playerComparisons, injuryPredictions, performanceTrends } from "@/lib/analyticsData"
import { Badge } from "@/components/ui/badge"
import { Select, SelectItem } from "@/components/ui/select"

export default function AnalyticsPage() {
  const [selectedPlayer, setSelectedPlayer] = useState("all")
  const [timeRange, setTimeRange] = useState("30")

  const filteredTrends = selectedPlayer === "all" 
    ? performanceTrends 
    : performanceTrends // In real app, filter by player
    
    const getRiskColor = (risk: number) => {
    if (risk < 45) return "text-green-500"
    if (risk < 60) return "text-yellow-500"
    return "text-red-500"
  }

  const getRiskBarColor = (risk: number) => {
    if (risk < 45) return "bg-green-500"
    if (risk < 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Advanced Analytics</h1>
              <div className="flex gap-4">
                <Select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="w-48"
                >
                  <SelectItem value="all">All Players</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-32"
                >
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </Select>
              </div>
            </div>

            {/* Injury Predictions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {injuryPredictions.map((prediction, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Injury Prediction: {prediction.player}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Risk Score</span>
                        <span className={`text-2xl font-bold ${getRiskColor(prediction.predictedRisk)}`}>
                          {prediction.predictedRisk}
                        </span>
                      </div>

                      {/* Risk Meter Bar */}
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${getRiskBarColor(prediction.predictedRisk)}`}
                          style={{ width: `${prediction.predictedRisk}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Key Factors:</p>
                      <div className="flex flex-wrap gap-2">
                        {prediction.factors.map((factor, i) => (
                          <Badge key={i} variant="outline">{factor}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm font-medium text-[#FDB927]">
                        {prediction.recommendedAction}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="risk">
                  <TabsList>
                    <TabsTrigger value="risk">Risk Score</TabsTrigger>
                    <TabsTrigger value="minutes">Minutes</TabsTrigger>
                    <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
                  </TabsList>
                  <TabsContent value="risk" className="mt-4">
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={filteredTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
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
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={filteredTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="minutes" fill="#FDB927" name="Minutes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  <TabsContent value="efficiency" className="mt-4">
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={filteredTrends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
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

            {/* Player Comparisons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#FDB927]" />
                  Player Comparisons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {playerComparisons.map((comparison, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{comparison.metric}</span>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">
                              {comparison.player1}
                            </div>
                            <div className="text-lg font-bold">{comparison.player1Value}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {comparison.difference > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm font-medium">
                              {Math.abs(comparison.difference)}
                            </span>
                          </div>
                          <div className="text-left">
                            <div className="text-sm text-muted-foreground">
                              {comparison.player2}
                            </div>
                            <div className="text-lg font-bold">{comparison.player2Value}</div>
                          </div>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${(comparison.player1Value / Math.max(comparison.player1Value, comparison.player2Value)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk vs Minutes Scatter */}
            <Card>
              <CardHeader>
                <CardTitle>Risk vs Minutes Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ScatterChart data={players.map((p) => ({
                    x: p.currentMinutes,
                    y: p.riskScore,
                    z: p.age,
                    name: p.name,
                  }))}>
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
                      name="Risk Score"
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <ZAxis type="number" dataKey="z" range={[50, 400]} name="Age" />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload as any
                          return (
                            <div className="rounded-lg border bg-card p-3 shadow-lg">
                              <p className="font-semibold">{data.name}</p>
                              <p className="text-sm">Minutes: {data.x}</p>
                              <p className="text-sm">Risk: {data.y}%</p>
                              <p className="text-sm">Age: {data.z}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Scatter
                      name="Players"
                      data={players.map((p) => ({
                        x: p.currentMinutes,
                        y: p.riskScore,
                        z: p.age,
                        name: p.name,
                      }))}
                      fill="#552583"
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
