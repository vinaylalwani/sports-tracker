"use client"

import { useEffect, useMemo, useState } from "react"
import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, Clock, Home, Plane, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { NBAGame } from "@/lib/nbaApi"

const LAKERS_TEAM_ID = 14

interface ScheduleGame {
  id: string
  date: string
  opponent: string
  location: "Home" | "Away"
  result?: "Win" | "Loss"
  score?: string
  restDays: number
  isBackToBack: boolean
  isThreeInFour: boolean
  stressLevel: number
}

function parseGameDate(dateStr: string): Date {
  const d = new Date(dateStr + "T12:00:00")
  return d
}

function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime())
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

function isThreeInFourDays(gameDates: string[], index: number): boolean {
  const current = parseGameDate(gameDates[index])
  const fourDaysAgo = new Date(current)
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 3)
  let count = 0
  for (let i = 0; i <= index; i++) {
    const d = parseGameDate(gameDates[i])
    if (d >= fourDaysAgo && d <= current) count++
  }
  return count >= 3
}

function nbaGameToScheduleGame(
  g: NBAGame,
  index: number,
  sortedDates: string[],
  prevDate: string | null
): ScheduleGame {
  const isLakersHome = g.home_team.id === LAKERS_TEAM_ID
  const opponent = isLakersHome ? g.visitor_team.full_name : g.home_team.full_name
  const location = isLakersHome ? "Home" : "Away"

  const restDays = prevDate
    ? daysBetween(parseGameDate(prevDate), parseGameDate(g.date))
    : 0
  const isBackToBack = restDays === 0 && index > 0
  const isThreeInFour = isThreeInFourDays(
    sortedDates,
    sortedDates.indexOf(g.date)
  )

  let stressLevel = 1.0
  if (isBackToBack) stressLevel += 0.35
  if (isThreeInFour) stressLevel += 0.2
  if (restDays === 1 && !isBackToBack) stressLevel += 0.1
  stressLevel = Math.round(stressLevel * 100) / 100

  const isFinal = g.status === "Final" || (g.home_team_score != null && g.visitor_team_score != null)
  let result: "Win" | "Loss" | undefined
  let score: string | undefined
  if (isFinal && g.home_team_score != null && g.visitor_team_score != null) {
    const lakersScore = isLakersHome ? g.home_team_score : g.visitor_team_score
    const oppScore = isLakersHome ? g.visitor_team_score : g.home_team_score
    result = lakersScore > oppScore ? "Win" : "Loss"
    score = `${lakersScore}-${oppScore}`
  }

  return {
    id: String(g.id),
    date: g.date,
    opponent,
    location,
    result,
    score,
    restDays,
    isBackToBack,
    isThreeInFour,
    stressLevel,
  }
}

export default function SchedulePage() {
  const [games, setGames] = useState<NBAGame[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchGames() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch("/api/nba/games?season=2025")
        if (!res.ok) throw new Error("Failed to fetch games")
        const data = await res.json()
        setGames(data.games || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load schedule")
        setGames([])
      } finally {
        setLoading(false)
      }
    }
    fetchGames()
  }, [])

  const { upcomingGames, pastGames } = useMemo(() => {
    const sorted = [...games].sort(
      (a, b) => parseGameDate(a.date).getTime() - parseGameDate(b.date).getTime()
    )
    const sortedDates = sorted.map((g) => g.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcoming: ScheduleGame[] = []
    const past: ScheduleGame[] = []
    let prevDate: string | null = null

    sorted.forEach((g, i) => {
      const gameDate = parseGameDate(g.date)
      const isPast = gameDate < today || g.status === "Final"
      const scheduleGame = nbaGameToScheduleGame(g, i, sortedDates, prevDate)
      if (isPast) past.push(scheduleGame)
      else upcoming.push(scheduleGame)
      prevDate = g.date
    })

    return { upcomingGames: upcoming, pastGames: past }
  }, [games])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + "T12:00:00")
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const getStressColor = (stress: number) => {
    if (stress < 1.2) return "text-green-500"
    if (stress < 1.4) return "text-yellow-500"
    return "text-red-500"
  }

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-[#FDB927]" />
              <p className="text-muted-foreground">Loading 2025-26 schedule…</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Could not load schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{error}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Make sure the BallDontLie API is configured (see API_SETUP.md) and the 2025-26 season data is available.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  const avgRest =
    upcomingGames.length > 0
      ? (
          upcomingGames.reduce((sum, g) => sum + g.restDays, 0) /
          upcomingGames.length
        ).toFixed(1)
      : "—"

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Schedule Management</h1>
                <p className="text-muted-foreground mt-1">
                  2025-26 season · Lakers games from BallDontLie API
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Upcoming Games</p>
                      <p className="text-2xl font-bold">{upcomingGames.length}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-[#FDB927]" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Back-to-Backs</p>
                      <p className="text-2xl font-bold text-yellow-500">
                        {upcomingGames.filter((g) => g.isBackToBack).length}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">3 in 4 Nights</p>
                      <p className="text-2xl font-bold text-red-500">
                        {upcomingGames.filter((g) => g.isThreeInFour).length}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Rest Days</p>
                      <p className="text-2xl font-bold">{avgRest}</p>
                    </div>
                    <Clock className="h-8 w-8 text-[#552583]" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming Games</TabsTrigger>
                <TabsTrigger value="past">Past Games</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4 mt-4">
                {upcomingGames.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No upcoming games in the current window.
                    </CardContent>
                  </Card>
                ) : (
                  upcomingGames.map((game) => (
                    <Card key={game.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground">
                                {formatDate(game.date)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(game.date + "T12:00:00").toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                            <div className="h-12 w-px bg-border" />
                            <div>
                              <div className="font-semibold text-lg">vs {game.opponent}</div>
                              <div className="flex items-center gap-2 mt-1">
                                {game.location === "Home" ? (
                                  <Home className="h-4 w-4 text-[#FDB927]" />
                                ) : (
                                  <Plane className="h-4 w-4 text-[#552583]" />
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {game.location}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Rest Days</div>
                              <div className="text-lg font-semibold">{game.restDays}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Stress Level</div>
                              <div className={`text-lg font-bold ${getStressColor(game.stressLevel)}`}>
                                {game.stressLevel.toFixed(2)}x
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {game.isBackToBack && (
                                <Badge variant="warning" className="w-fit">
                                  Back-to-Back
                                </Badge>
                              )}
                              {game.isThreeInFour && (
                                <Badge variant="danger" className="w-fit">
                                  3 in 4 Nights
                                </Badge>
                              )}
                              {!game.isBackToBack && !game.isThreeInFour && (
                                <Badge variant="success" className="w-fit">
                                  Normal Schedule
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4 mt-4">
                {pastGames.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No past games in the current window.
                    </CardContent>
                  </Card>
                ) : (
                  pastGames.map((game) => (
                    <Card key={game.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground">
                                {formatDate(game.date)}
                              </div>
                            </div>
                            <div className="h-12 w-px bg-border" />
                            <div>
                              <div className="font-semibold text-lg">vs {game.opponent}</div>
                              <div className="flex items-center gap-2 mt-1">
                                {game.location === "Home" ? (
                                  <Home className="h-4 w-4 text-[#FDB927]" />
                                ) : (
                                  <Plane className="h-4 w-4 text-[#552583]" />
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {game.location}
                                </span>
                              </div>
                              {game.result && (
                                <div className="mt-2">
                                  <Badge
                                    variant={game.result === "Win" ? "success" : "destructive"}
                                  >
                                    {game.result} {game.score}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Stress Level</div>
                            <div className={`text-lg font-bold ${getStressColor(game.stressLevel)}`}>
                              {game.stressLevel.toFixed(2)}x
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
