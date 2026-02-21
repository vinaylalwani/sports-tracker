"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { RiskTrendData } from "@/lib/mockData"

interface RiskTrendChartProps {
  data: RiskTrendData[]
}

export function RiskTrendChart({ data }: RiskTrendChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="rounded-lg border bg-card p-3 shadow-lg">
          <p className="font-semibold mb-2">Game {data.game}</p>
          <p className="text-sm">Minutes: {data.minutes}</p>
          <p className="text-sm">Schedule Stress: {data.scheduleStress.toFixed(2)}x</p>
          <p className="text-sm">Game Load Score: {data.gameLoadScore.toFixed(1)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical Risk Trend (Last 20 Games)</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="baseline" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="baseline">Baseline Risk</TabsTrigger>
            <TabsTrigger value="dynamic">Dynamic Risk</TabsTrigger>
          </TabsList>
          <TabsContent value="baseline" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="game" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="baselineRisk"
                  stroke="#552583"
                  strokeWidth={2}
                  name="Baseline Risk"
                  dot={{ fill: "#552583", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="dynamic" className="mt-4">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="game" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="dynamicRisk"
                  stroke="#FDB927"
                  strokeWidth={2}
                  name="Dynamic Risk"
                  dot={{ fill: "#FDB927", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
