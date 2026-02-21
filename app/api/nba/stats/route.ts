import { NextResponse } from "next/server"
import { nbaApi } from "@/lib/nbaApi"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get("playerId")
    const season = searchParams.get("season")

    if (!playerId) {
      return NextResponse.json(
        { error: "playerId is required" },
        { status: 400 }
      )
    }

    const stats = await nbaApi.getPlayerStats(
      parseInt(playerId),
      season ? parseInt(season) : undefined
    )

    const averages = nbaApi.calculateAverageStats(stats)

    return NextResponse.json({ stats, averages })
  } catch (error) {
    console.error("Error fetching NBA stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
