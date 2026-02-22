"use client"

import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"
import { VideoAnalysisPanel } from "@/components/dashboard/VideoAnalysisPanel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { History, FileVideo, TrendingUp } from "lucide-react"
import { combineVisionWithBaseline } from "@/lib/riskProjection"
import { useState } from "react"

export default function VideoPage() {
  // 🔵 Vision Risk State (NEW)
  const [visionRisk, setVisionRisk] = useState<number | null>(null)

  // 🔵 Example baseline risk (replace later with real player data)
  const baselineRisk = 40

  // 🔵 Final Combined Risk
  const finalRisk =
    visionRisk !== null
      ? combineVisionWithBaseline(baselineRisk, visionRisk)
      : baselineRisk

  const getRiskStatus = (risk: number) => {
    if (risk < 30) return "Low Risk"
    if (risk < 60) return "Moderate Risk"
    return "High Risk"
  }

  // Mock video analysis history
  const analysisHistory = [
    {
      id: "1",
      date: "2024-01-12",
      player: "Anthony Davis",
      opponent: "Portland Trail Blazers",
      riskScore: 78,
      jumpCount: 145,
      status: "High Risk",
    },
    {
      id: "2",
      date: "2024-01-10",
      player: "LeBron James",
      opponent: "LA Clippers",
      riskScore: 65,
      jumpCount: 98,
      status: "Moderate Risk",
    },
    {
      id: "3",
      date: "2024-01-08",
      player: "Austin Reaves",
      opponent: "Miami Heat",
      riskScore: 42,
      jumpCount: 112,
      status: "Low Risk",
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Video Analysis</h1>
                <p className="text-muted-foreground mt-1">
                  Upload and analyze game footage for movement quality assessment
                </p>
              </div>
            </div>

            {/* Main Video Analysis Panel */}
            <VideoAnalysisPanel onRiskComputed={setVisionRisk} />

            {/* 🔵 NEW: Integrated Risk Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#FDB927]" />
                  Integrated Injury Projection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Baseline Risk
                    </div>
                    <div className="font-semibold">{baselineRisk}%</div>
                  </div>

                  {visionRisk !== null && (
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Vision Risk
                      </div>
                      <div className="font-semibold">{visionRisk}%</div>
                    </div>
                  )}

                  <div>
                    <div className="text-sm text-muted-foreground">
                      Final Combined Risk
                    </div>
                    <div className="text-lg font-bold text-[#FDB927]">
                      {finalRisk.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <Badge
                  className="mt-4"
                  variant={
                    finalRisk < 30
                      ? "success"
                      : finalRisk < 60
                      ? "warning"
                      : "danger"
                  }
                >
                  {getRiskStatus(finalRisk)}
                </Badge>
              </CardContent>
            </Card>

            {/* Analysis History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-[#FDB927]" />
                  Analysis History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisHistory.map((analysis) => (
                    <div
                      key={analysis.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <FileVideo className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">
                            {analysis.player}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            vs {analysis.opponent} • {analysis.date}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Jumps
                          </div>
                          <div className="font-semibold">
                            {analysis.jumpCount}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Risk Score
                          </div>
                          <div className="text-lg font-bold text-[#FDB927]">
                            {analysis.riskScore}%
                          </div>
                        </div>
                        <Badge
                          variant={
                            analysis.status === "High Risk"
                              ? "danger"
                              : analysis.status === "Moderate Risk"
                              ? "warning"
                              : "success"
                          }
                        >
                          {analysis.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Analysis Tips */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#FDB927]" />
                    Best Practices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Use clear, well-lit footage</li>
                    <li>• Ensure full body visibility</li>
                    <li>• Record from multiple angles</li>
                    <li>• Analyze within 24 hours</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Landing mechanics quality</li>
                    <li>• Movement asymmetry</li>
                    <li>• Fatigue indicators</li>
                    <li>• Jump frequency</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Risk Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Poor landing technique</li>
                    <li>• Asymmetric movement</li>
                    <li>• Excessive fatigue</li>
                    <li>• High contact frequency</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}