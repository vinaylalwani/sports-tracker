"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, Plane, Clock, Loader2 } from "lucide-react"
import { ScheduleStress } from "@/lib/mockData"
import { upcomingGames as fallbackGames, computeScheduleStats, type Game } from "@/lib/scheduleData"

interface ScheduleStressCardProps {
  schedule: ScheduleStress
}

export function ScheduleStressCard({ schedule }: ScheduleStressCardProps) {
  const [games, setGames] = useState<Game[]>(fallbackGames)
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch("/api/schedule")
        if (res.ok) {
          const data = await res.json()
          if (data.games && data.games.length > 0) {
            setGames(data.games)
            setIsLive(true)
          }
        }
      } catch {
        // Fallback to static data — already set
      } finally {
        setLoading(false)
      }
    }
    fetchSchedule()
  }, [])

  const stats = computeScheduleStats(games)

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#FDB927]" />
          Upcoming Schedule
          {isLive && (
            <Badge variant="outline" className="text-[10px] ml-auto">LIVE</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {/* Summary facts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            {stats.backToBack ? (
              <>
                <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                <div>
                  <div className="text-sm font-medium">Back-to-Back</div>
                  <Badge variant="warning" className="mt-1">{stats.b2bCount} upcoming</Badge>
                </div>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <div className="text-sm font-medium">Back-to-Back</div>
                  <Badge variant="success" className="mt-1">None</Badge>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {stats.threeInFour ? (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <div className="text-sm font-medium">3 in 4 Nights</div>
                  <Badge variant="danger" className="mt-1">{stats.threeInFourCount} upcoming</Badge>
                </div>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <div className="text-sm font-medium">3 in 4 Nights</div>
                  <Badge variant="success" className="mt-1">None</Badge>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            <Plane className="h-5 w-5 text-[#552583] shrink-0" />
            <div>
              <div className="text-sm font-medium">Road Trip</div>
              <div className="text-lg font-semibold">
                {stats.roadTripLength} game{stats.roadTripLength !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-[#552583] shrink-0" />
            <div>
              <div className="text-sm font-medium">Avg Rest</div>
              <div className="text-lg font-semibold">
                {stats.restDays} day{stats.restDays !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Schedule Multiplier</span>
            <span className="text-2xl font-bold text-[#FDB927]">
              {stats.scheduleMultiplier.toFixed(2)}x
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalGames} games · {stats.awayCount} away · {stats.b2bCount} back-to-backs
          </p>
        </div>

        {/* Upcoming games list */}
        <div className="pt-2 border-t border-border">
          <h4 className="text-sm font-medium mb-2">Upcoming Games</h4>
          {loading ? (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading schedule...</span>
            </div>
          ) : (
            <ul className="space-y-1.5 max-h-64 overflow-y-auto">
              {games.map((game) => (
                <li
                  key={game.id}
                  className="flex items-center justify-between text-sm py-2 px-3 rounded-md bg-muted/40"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">{game.opponent}</span>
                    <span className="text-xs text-muted-foreground">
                      {game.date} · {game.location} · {game.restDays}d rest
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {game.isBackToBack && (
                      <Badge variant="warning" className="text-[10px] px-1.5 py-0">B2B</Badge>
                    )}
                    {game.isThreeInFour && (
                      <Badge variant="danger" className="text-[10px] px-1.5 py-0">3in4</Badge>
                    )}
                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                      {game.stressLevel.toFixed(2)}x
                    </span>
                  </div>
                </li>
              ))}
              {games.length === 0 && (
                <li className="text-sm text-muted-foreground text-center py-4">
                  No upcoming games found
                </li>
              )}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
