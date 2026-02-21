"use client"

import { Sidebar } from "@/components/dashboard/Sidebar"
import { Header } from "@/components/dashboard/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Clock, AlertTriangle, Plane, Home } from "lucide-react"
import { upcomingGames, pastGames } from "@/lib/scheduleData"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function SchedulePage() {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
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

  const getStressBadge = (stress: number) => {
    if (stress < 1.2) return "success"
    if (stress < 1.4) return "warning"
    return "danger"
  }

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
                  Monitor upcoming games, rest days, and schedule stress
                </p>
              </div>
            </div>

            {/* Schedule Summary */}
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
                      <p className="text-2xl font-bold">
                        {(
                          upcomingGames.reduce((sum, g) => sum + g.restDays, 0) /
                          upcomingGames.length
                        ).toFixed(1)}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-[#552583]" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Schedule Tabs */}
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming Games</TabsTrigger>
                <TabsTrigger value="past">Past Games</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4 mt-4">
                {upcomingGames.map((game) => (
                  <Card key={game.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">
                              {formatDate(game.date)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(game.date).toLocaleDateString("en-US", {
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
                ))}
              </TabsContent>

              <TabsContent value="past" className="space-y-4 mt-4">
                {pastGames.map((game) => (
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
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
