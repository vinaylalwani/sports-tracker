import { NextResponse } from "next/server"
import { nbaApi } from "@/lib/nbaApi"

// Use globalThis to persist cache across hot reloads in dev
const globalCache = globalThis as unknown as {
  __scheduleCache?: { games: any[]; timestamp: number }
}

const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

export async function GET() {
  const now = Date.now()

  // Return cached data if still fresh
  if (globalCache.__scheduleCache && now - globalCache.__scheduleCache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ games: globalCache.__scheduleCache.games, cached: true })
  }

  try {
    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 30)

    const startStr = today.toISOString().split("T")[0]
    const endStr = endDate.toISOString().split("T")[0]

    const games = await nbaApi.getGames({
      teamId: 14,
      start_date: startStr,
      end_date: endStr,
    })

    const sorted = games.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const transformed = sorted.map((game, i) => {
      const isHome = game.home_team.id === 14
      const opponent = isHome
        ? game.visitor_team.full_name
        : game.home_team.full_name
      const location: "Home" | "Away" = isHome ? "Home" : "Away"
      const dateStr = game.date.split("T")[0]

      let restDays = 2
      if (i > 0) {
        const prevDate = new Date(sorted[i - 1].date)
        const currDate = new Date(game.date)
        const diff = Math.floor(
          (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        restDays = Math.max(diff - 1, 0)
      }

      const isBackToBack = restDays === 0

      let isThreeInFour = false
      if (i >= 2) {
        const twoBefore = new Date(sorted[i - 2].date)
        const currDate = new Date(game.date)
        const span = Math.floor(
          (currDate.getTime() - twoBefore.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (span <= 3) isThreeInFour = true
      }

      let stressLevel = 1.0
      if (location === "Away") stressLevel += 0.1
      if (isBackToBack) stressLevel += 0.35
      if (isThreeInFour) stressLevel += 0.25
      if (restDays === 0) stressLevel += 0.1
      stressLevel = parseFloat(stressLevel.toFixed(2))

      return {
        id: String(game.id),
        date: dateStr,
        opponent,
        location,
        restDays,
        isBackToBack,
        isThreeInFour,
        stressLevel,
      }
    })

    globalCache.__scheduleCache = { games: transformed, timestamp: now }

    return NextResponse.json({ games: transformed })
  } catch (error) {
    console.error("Schedule API error:", error)

    // Return stale cache if available
    if (globalCache.__scheduleCache) {
      return NextResponse.json({ games: globalCache.__scheduleCache.games, cached: true, stale: true })
    }

    return NextResponse.json({ games: [], error: "Failed to fetch schedule" }, { status: 500 })
  }
}
