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

export default function Dashboard() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
                {players.map((player) => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>
            </div>

            {/* Historical Risk Trend */}
            <RiskTrendChart data={riskTrendData} />

            {/* Video Analysis and Schedule Stress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <div className="min-h-0 flex flex-col [&>*]:flex-1">
                <VideoAnalysisPanel />
              </div>
              <div className="min-h-0 flex flex-col [&>*]:flex-1">
                <ScheduleStressCard schedule={scheduleStress} />
              </div>
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
