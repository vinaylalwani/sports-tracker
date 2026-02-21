import { NextResponse } from "next/server"
import { nbaApi } from "@/lib/nbaApi"

const LAKERS_TEAM_ID = 14
const SEASON_2025_26 = 2025

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamIdParam = searchParams.get("teamId")
    const seasonParam = searchParams.get("season")
    const dates = searchParams.getAll("dates")

    const teamId = teamIdParam ? parseInt(teamIdParam) : LAKERS_TEAM_ID
    const season = seasonParam ? parseInt(seasonParam) : SEASON_2025_26

    const games = await nbaApi.getGames({
      teamId,
      seasons: [season],
      dates: dates.length > 0 ? dates : undefined,
    })

    return NextResponse.json({ games })
  } catch (error) {
    console.error("Error fetching NBA games:", error)
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    )
  }
}
