"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, Plane, Clock, Loader2 } from "lucide-react"
import { upcomingGames as fallbackGames, computeScheduleStats, type Game } from "@/lib/scheduleData"
import { fetchSchedule } from "@/lib/scheduleClient"
import { cn } from "@/lib/utils"

export default function SchedulePage() {
  const [games, setGames] = useState<Game[]>(fallbackGames)
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    fetchSchedule()
      .then(({ games: liveGames, isLive: live }) => {
        if (liveGames.length > 0) {
          setGames(liveGames)
          setIsLive(live)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const stats = computeScheduleStats(games)

  const getStressColor = (stress: number) => {
    if (stress >= 1.4) return "text-red-500"
    if (stress >= 1.2) return "text-amber-500"
    return "text-green-500"
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Schedule</h1>
                <p className="text-muted-foreground mt-1">
                  Upcoming Lakers games and schedule stress analysis
                </p>
              </div>
              {isLive && (
                <Badge variant="outline" className="text-xs">LIVE DATA</Badge>
              )}
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-[#FDB927]" />
                  <div className="text-3xl font-bold">{stats.totalGames}</div>
                  <p className="text-xs text-muted-foreground mt-1">Upcoming Games</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Plane className="h-6 w-6 mx-auto mb-2 text-[#552583]" />
                  <div className="text-3xl font-bold">{stats.awayCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Away Games</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <AlertTriangle className={cn("h-6 w-6 mx-auto mb-2", stats.b2bCount > 0 ? "text-yellow-500" : "text-green-500")} />
                  <div className="text-3xl font-bold">{stats.b2bCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">Back-to-Backs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <AlertTriangle className={cn("h-6 w-6 mx-auto mb-2", stats.threeInFourCount > 0 ? "text-red-500" : "text-green-500")} />
                  <div className="text-3xl font-bold">{stats.threeInFourCount}</div>
                  <p className="text-xs text-muted-foreground mt-1">3-in-4 Nights</p>
                </CardContent>
              </Card>
            </div>

            {/* Schedule details row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Rest Days</p>
                      <p className="text-2xl font-bold">{stats.restDays} day{stats.restDays !== 1 ? "s" : ""}</p>
                    </div>
                    <Clock className="h-8 w-8 text-[#552583]" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Longest Road Trip</p>
                      <p className="text-2xl font-bold">{stats.roadTripLength} game{stats.roadTripLength !== 1 ? "s" : ""}</p>
                    </div>
                    <Plane className="h-8 w-8 text-[#FDB927]" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Schedule Multiplier</p>
                      <p className="text-2xl font-bold text-white">{stats.scheduleMultiplier.toFixed(2)}x</p>
                    </div>
                    <Calendar className="h-8 w-8 text-[#552583]" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Full game list */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#FDB927]" />
                  All Upcoming Games
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-3" />
                    <span>Loading schedule...</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Opponent</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Location</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Rest Days</th>
                          <th className="text-center py-3 px-4 font-medium text-muted-foreground">Flags</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Stress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {games.map((game) => (
                          <tr key={game.id} className="border-t border-border/50 hover:bg-muted/30">
                            <td className="py-3 px-4 font-medium">{game.date}</td>
                            <td className="py-3 px-4">{game.opponent}</td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={game.location === "Home" ? "success" : "outline"} className="text-xs">
                                {game.location}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center tabular-nums">
                              <span className={cn(
                                "font-semibold",
                                game.restDays === 0 ? "text-red-500" : game.restDays === 1 ? "text-amber-500" : "text-green-500"
                              )}>
                                {game.restDays}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {game.isBackToBack && (
                                  <Badge variant="warning" className="text-[10px] px-1.5 py-0">B2B</Badge>
                                )}
                                {game.isThreeInFour && (
                                  <Badge variant="danger" className="text-[10px] px-1.5 py-0">3in4</Badge>
                                )}
                                {!game.isBackToBack && !game.isThreeInFour && (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            </td>
                            <td className={cn("py-3 px-4 text-right font-bold tabular-nums", getStressColor(game.stressLevel))}>
                              {game.stressLevel.toFixed(2)}x
                            </td>
                          </tr>
                        ))}
                        {games.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-muted-foreground">
                              No upcoming games found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
