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
    stressLevel: 1.2,
  },
  {
    id: "2",
    date: "2024-01-16",
    opponent: "Phoenix Suns",
    location: "Away",
    restDays: 0,
    isBackToBack: true,
    isThreeInFour: false,
    stressLevel: 1.5,
  },
  {
    id: "3",
    date: "2024-01-18",
    opponent: "Denver Nuggets",
    location: "Away",
    restDays: 1,
    isBackToBack: false,
    isThreeInFour: true,
    stressLevel: 1.4,
  },
  {
    id: "4",
    date: "2024-01-20",
    opponent: "Boston Celtics",
    location: "Home",
    restDays: 1,
    isBackToBack: false,
    isThreeInFour: true,
    stressLevel: 1.3,
  },
  {
    id: "5",
    date: "2024-01-22",
    opponent: "Miami Heat",
    location: "Away",
    restDays: 1,
    isBackToBack: false,
    isThreeInFour: true,
    stressLevel: 1.35,
  },
  {
    id: "6",
    date: "2024-01-25",
    opponent: "Milwaukee Bucks",
    location: "Home",
    restDays: 2,
    isBackToBack: false,
    isThreeInFour: false,
    stressLevel: 1.1,
  },
  {
    id: "7",
    date: "2024-01-27",
    opponent: "Dallas Mavericks",
    location: "Away",
    restDays: 1,
    isBackToBack: false,
    isThreeInFour: false,
    stressLevel: 1.25,
  },
  {
    id: "8",
    date: "2024-01-28",
    opponent: "Houston Rockets",
    location: "Away",
    restDays: 0,
    isBackToBack: true,
    isThreeInFour: true,
    stressLevel: 1.6,
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
