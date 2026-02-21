import { NextResponse } from "next/server"
import { nbaApi } from "@/lib/nbaApi"

export async function GET() {
  try {
    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 30)

    const startStr = today.toISOString().split("T")[0]
    const endStr = endDate.toISOString().split("T")[0]

    // Lakers team ID = 14
    const games = await nbaApi.getGames({
      teamId: 14,
      start_date: startStr,
      end_date: endStr,
    })

    // Sort by date
    const sorted = games.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Transform to our Game format with stress calculations
    const transformed = sorted.map((game, i) => {
      const isHome = game.home_team.id === 14
      const opponent = isHome
        ? game.visitor_team.full_name
        : game.home_team.full_name
      const location: "Home" | "Away" = isHome ? "Home" : "Away"
      const dateStr = game.date.split("T")[0]

      // Calculate rest days from previous game
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

      // 3-in-4: check if this is the 3rd game in a 4-night window
      let isThreeInFour = false
      if (i >= 2) {
        const twoBefore = new Date(sorted[i - 2].date)
        const currDate = new Date(game.date)
        const span = Math.floor(
          (currDate.getTime() - twoBefore.getTime()) / (1000 * 60 * 60 * 24)
        )
        if (span <= 3) isThreeInFour = true
      }

      // Stress level calculation
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

    return NextResponse.json({ games: transformed })
  } catch (error) {
    console.error("Schedule API error:", error)
    return NextResponse.json({ games: [], error: "Failed to fetch schedule" }, { status: 500 })
  }
}
