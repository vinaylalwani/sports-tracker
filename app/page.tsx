"use client"

import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"
import { TeamAvailabilityCard } from "@/components/dashboard/TeamAvailabilityCard"
import { PlayerCard } from "@/components/dashboard/PlayerCard"
import { RiskTrendChart } from "@/components/dashboard/RiskTrendChart"
import { ScheduleStressCard } from "@/components/dashboard/ScheduleStressCard"
import { MinutesSimulator } from "@/components/dashboard/MinutesSimulator"
import { FeatureImportanceChart } from "@/components/dashboard/FeatureImportanceChart"
import { VideoAnalysisPanel } from "@/components/dashboard/VideoAnalysisPanel"
import {
  players,
  riskTrendData,
  scheduleStress,
  featureImportance,
} from "@/lib/mockData"
import { useVideoRisk } from "@/contexts/VideoRiskContext"

export default function Dashboard() {
  const { videoCombinedRisks, updatePlayerRisk } = useVideoRisk()

  const handleAssignToPlayer = (playerId: string, videoRisk: number) => {
    const player = players.find((p) => p.id === playerId)
    if (!player) return
    updatePlayerRisk(playerId, videoRisk, player.riskScore)
  }

  // Merge video-adjusted risk scores into player objects for display
  const displayPlayers = players.map((p) => {
    const combined = videoCombinedRisks[p.id]
    if (combined == null) return p
    const riskScore = parseFloat(Math.max(0, Math.min(100, combined)).toFixed(2))
    const riskClassification: "Low" | "Moderate" | "High" =
      riskScore < 45 ? "Low" : riskScore < 65 ? "Moderate" : "High"
    const rec =
      riskScore >= 85 ? p.currentMinutes * 0.8
      : riskScore >= 75 ? p.currentMinutes * 0.85
      : riskScore >= 65 ? p.currentMinutes * 0.9
      : riskScore >= 55 ? p.currentMinutes * 0.95
      : p.currentMinutes
    return {
      ...p,
      riskScore,
      riskClassification,
      recommendedMinutes: parseFloat(rec.toFixed(2)),
    }
  })

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Team Availability Summary */}
            <TeamAvailabilityCard />

            {/* Player Overview Panel */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Starting Five Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {displayPlayers.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            </div>

            {/* Historical Risk Trend */}
            <RiskTrendChart data={riskTrendData} />

            {/* Video Analysis and Schedule Stress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VideoAnalysisPanel
                dashboardPlayers={players.map((p) => ({ id: p.id, name: p.name }))}
                onAssignToPlayer={handleAssignToPlayer}
              />
              <ScheduleStressCard schedule={scheduleStress} />
            </div>

            {/* Minutes Simulator and Feature Importance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MinutesSimulator />
              <FeatureImportanceChart data={featureImportance} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
