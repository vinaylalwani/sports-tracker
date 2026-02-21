// BALLDONTLIE NBA API Integration
// Free tier: https://www.balldontlie.io/
// Documentation: https://docs.balldontlie.io/

export interface NBAPlayer {
  id: number
  first_name: string
  last_name: string
  position: string
  height_feet: number | null
  height_inches: number | null
  weight_pounds: number | null
  team: {
    id: number
    abbreviation: string
    city: string
    conference: string
    division: string
    full_name: string
    name: string
  }
}

export interface NBAGame {
  id: number
  date: string
  season: number
  status: string
  period: number | null
  time: string | null
  postseason: boolean
  home_team: {
    id: number
    abbreviation: string
    city: string
    conference: string
    division: string
    full_name: string
    name: string
  }
  visitor_team: {
    id: number
    abbreviation: string
    city: string
    conference: string
    division: string
    full_name: string
    name: string
  }
  home_team_score: number | null
  visitor_team_score: number | null
}

export interface NBAStats {
  id: number
  ast: number | null
  blk: number | null
  dreb: number | null
  fg3_pct: number | null
  fg3a: number | null
  fg3m: number | null
  fg_pct: number | null
  fga: number | null
  fgm: number | null
  ft_pct: number | null
  fta: number | null
  ftm: number | null
  game: {
    id: number
    date: string
    season: number
  }
  min: string | null
  oreb: number | null
  pf: number | null
  player: {
    id: number
    first_name: string
    last_name: string
  }
  pts: number | null
  reb: number | null
  stl: number | null
  team: {
    id: number
    abbreviation: string
    city: string
    conference: string
    division: string
    full_name: string
    name: string
  }
  turnover: number | null
}

class NBAApi {
  private baseUrl = "https://www.balldontlie.io/api/v1"
  private apiKey: string | null = null

  constructor() {
    // API key is loaded from environment variables
    // For client-side, we'll pass it through API routes
    this.apiKey = process.env.NBA_API_KEY || null
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    // Add API key to headers if available
    // Note: BALLDONTLIE free tier doesn't require auth, but some APIs do
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
      // Or if the API uses a different format:
      // headers['X-API-Key'] = this.apiKey
    }
    
    return headers
  }

  async getPlayers(teamId?: number, search?: string): Promise<NBAPlayer[]> {
    try {
      let url = `${this.baseUrl}/players?per_page=100`
      if (teamId) url += `&team_ids[]=${teamId}`
      if (search) url += `&search=${encodeURIComponent(search)}`
      // Add API key as query param if needed
      if (this.apiKey) url += `&api_key=${this.apiKey}`

      const response = await fetch(url, {
        headers: this.getHeaders(),
      })
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      
      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error("Error fetching players:", error)
      return []
    }
  }

  async getPlayerStats(playerId: number, season?: number): Promise<NBAStats[]> {
    try {
      let url = `${this.baseUrl}/stats?player_ids[]=${playerId}&per_page=100`
      if (season) url += `&seasons[]=${season}`
      if (this.apiKey) url += `&api_key=${this.apiKey}`

      const response = await fetch(url, {
        headers: this.getHeaders(),
      })
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      
      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error("Error fetching player stats:", error)
      return []
    }
  }

  async getGames(teamId?: number, dates?: string[]): Promise<NBAGame[]> {
    try {
      let url = `${this.baseUrl}/games?per_page=100`
      if (teamId) url += `&team_ids[]=${teamId}`
      if (dates && dates.length > 0) {
        dates.forEach(date => {
          url += `&dates[]=${date}`
        })
      }
      if (this.apiKey) url += `&api_key=${this.apiKey}`

      const response = await fetch(url, {
        headers: this.getHeaders(),
      })
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      
      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error("Error fetching games:", error)
      return []
    }
  }

  async getTeam(teamId: number) {
    try {
      const response = await fetch(`${this.baseUrl}/teams/${teamId}`)
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      
      return await response.json()
    } catch (error) {
      console.error("Error fetching team:", error)
      return null
    }
  }

  // Get Lakers team ID (14 is typically Lakers)
  async getLakersPlayers(): Promise<NBAPlayer[]> {
    return this.getPlayers(14) // Lakers team ID
  }

  // Calculate minutes from stats
  parseMinutes(minString: string | null): number {
    if (!minString) return 0
    const parts = minString.split(":")
    return parseInt(parts[0]) + (parseInt(parts[1]) || 0) / 60
  }

  // Calculate average stats for a player
  calculateAverageStats(stats: NBAStats[]) {
    if (stats.length === 0) return null

    const totals = stats.reduce(
      (acc, stat) => ({
        minutes: acc.minutes + this.parseMinutes(stat.min),
        points: acc.points + (stat.pts || 0),
        rebounds: acc.rebounds + (stat.reb || 0),
        assists: acc.assists + (stat.ast || 0),
        games: acc.games + 1,
      }),
      { minutes: 0, points: 0, rebounds: 0, assists: 0, games: 0 }
    )

    return {
      avgMinutes: totals.minutes / totals.games,
      avgPoints: totals.points / totals.games,
      avgRebounds: totals.rebounds / totals.games,
      avgAssists: totals.assists / totals.games,
      gamesPlayed: totals.games,
    }
  }
}

export const nbaApi = new NBAApi()
