"use client"

import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"
import { VideoAnalysisPanel } from "@/components/dashboard/VideoAnalysisPanel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

export default function VideoPage() {
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
            <VideoAnalysisPanel />

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