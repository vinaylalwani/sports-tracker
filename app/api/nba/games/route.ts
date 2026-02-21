import { NextResponse } from "next/server"
import { nbaApi } from "@/lib/nbaApi"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")
    const dates = searchParams.getAll("dates")

    const games = await nbaApi.getGames(
      teamId ? parseInt(teamId) : undefined,
      dates.length > 0 ? dates : undefined
    )

    return NextResponse.json({ games })
  } catch (error) {
    console.error("Error fetching NBA games:", error)
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    )
  }
}
