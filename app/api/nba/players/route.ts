import { NextResponse } from "next/server"
import { nbaApi } from "@/lib/nbaApi"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")
    const search = searchParams.get("search")

    // API key is loaded from environment variables server-side
    const players = await nbaApi.getPlayers(
      teamId ? parseInt(teamId) : undefined,
      search || undefined
    )

    return NextResponse.json({ players })
  } catch (error) {
    console.error("Error fetching NBA players:", error)
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    )
  }
}
