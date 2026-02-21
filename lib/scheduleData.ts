export interface Game {
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

export interface ScheduleMonth {
  month: string
  year: number
  games: Game[]
}

export const upcomingGames: Game[] = [
  {
    id: "1",
    date: "2024-01-15",
    opponent: "Golden State Warriors",
    location: "Home",
    restDays: 2,
    isBackToBack: false,
    isThreeInFour: false,
    stressLevel: 1.0,
  },
  {
    id: "2",
    date: "2024-01-16",
    opponent: "Phoenix Suns",
    location: "Away",
    restDays: 0,
    isBackToBack: true,
    isThreeInFour: false,
    stressLevel: 1.45,
  },
  {
    id: "3",
    date: "2024-01-18",
    opponent: "Denver Nuggets",
    location: "Away",
    restDays: 1,
    isBackToBack: false,
    isThreeInFour: true,     // Jan 15, 16, 18 = 3 games in 4 nights
    stressLevel: 1.40,
  },
  {
    id: "4",
    date: "2024-01-20",
    opponent: "Boston Celtics",
    location: "Home",
    restDays: 1,
    isBackToBack: false,
    isThreeInFour: false,
    stressLevel: 1.15,
  },
  {
    id: "5",
    date: "2024-01-22",
    opponent: "Miami Heat",
    location: "Away",
    restDays: 1,
    isBackToBack: false,
    isThreeInFour: false,
    stressLevel: 1.10,
  },
  {
    id: "6",
    date: "2024-01-25",
    opponent: "Milwaukee Bucks",
    location: "Home",
    restDays: 2,
    isBackToBack: false,
    isThreeInFour: false,
    stressLevel: 1.0,
  },
  {
    id: "7",
    date: "2024-01-27",
    opponent: "Dallas Mavericks",
    location: "Away",
    restDays: 1,
    isBackToBack: false,
    isThreeInFour: false,
    stressLevel: 1.10,
  },
  {
    id: "8",
    date: "2024-01-28",
    opponent: "Houston Rockets",
    location: "Away",
    restDays: 0,
    isBackToBack: true,
    isThreeInFour: false,
    stressLevel: 1.50,
  },
]

export const pastGames: Game[] = [
  {
    id: "p1",
    date: "2024-01-10",
    opponent: "LA Clippers",
    location: "Home",
    result: "Win",
    score: "112-105",
    restDays: 1,
    isBackToBack: false,
    isThreeInFour: false,
    stressLevel: 1.2,
  },
  {
    id: "p2",
    date: "2024-01-12",
    opponent: "Portland Trail Blazers",
    location: "Away",
    result: "Win",
    score: "128-121",
    restDays: 1,
    isBackToBack: false,
    isThreeInFour: true,
    stressLevel: 1.3,
  },
]

/** Compute schedule summary stats from a list of games */
export function computeScheduleStats(games: Game[]) {
  const hasBackToBack = games.some((g) => g.isBackToBack)
  const hasThreeInFour = games.some((g) => g.isThreeInFour)
  const b2bCount = games.filter((g) => g.isBackToBack).length
  const threeInFourCount = games.filter((g) => g.isThreeInFour).length
  const awayCount = games.filter((g) => g.location === "Away").length

  // Road trip: only consider games within the next 7 days
  const now = new Date()
  const oneWeekOut = new Date(now)
  oneWeekOut.setDate(oneWeekOut.getDate() + 7)

  const nextWeekGames = games.filter((g) => {
    const d = new Date(g.date)
    return d >= now && d <= oneWeekOut
  })

  // If no games fall in the window (e.g. static/fallback dates in the past),
  // use the first 7-day span of the dataset instead
  const windowGames = nextWeekGames.length > 0 ? nextWeekGames : (() => {
    if (games.length === 0) return []
    const first = new Date(games[0].date)
    const cutoff = new Date(first)
    cutoff.setDate(cutoff.getDate() + 7)
    return games.filter((g) => new Date(g.date) <= cutoff)
  })()

  let maxRoadTrip = 0
  let currentRoadTrip = 0
  for (const g of windowGames) {
    if (g.location === "Away") {
      currentRoadTrip++
      maxRoadTrip = Math.max(maxRoadTrip, currentRoadTrip)
    } else {
      currentRoadTrip = 0
    }
  }

  const totalRest = games.reduce((s, g) => s + g.restDays, 0)
  const avgRest = games.length > 0 ? parseFloat((totalRest / games.length).toFixed(2)) : 0

  const avgStress =
    games.length > 0
      ? parseFloat((games.reduce((s, g) => s + g.stressLevel, 0) / games.length).toFixed(2))
      : 1.0

  return {
    backToBack: hasBackToBack,
    threeInFour: hasThreeInFour,
    b2bCount,
    threeInFourCount,
    awayCount,
    roadTripLength: maxRoadTrip,
    restDays: Math.round(avgRest),
    scheduleMultiplier: avgStress,
    totalGames: games.length,
  }
}
