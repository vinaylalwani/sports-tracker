export interface PlayerComparison {
  player1: string
  player2: string
  metric: string
  player1Value: number
  player2Value: number
  difference: number
}

export interface InjuryPrediction {
  player: string
  predictedRisk: number
  confidence: number
  factors: string[]
  recommendedAction: string
}

export interface PerformanceTrend {
  date: string
  riskScore: number
  minutes: number
  efficiency: number
}

export const playerComparisons: PlayerComparison[] = [
  {
    player1: "LeBron James",
    player2: "Anthony Davis",
    metric: "Injury Risk",
    player1Value: 68,
    player2Value: 75,
    difference: -7,
  },
  {
    player1: "LeBron James",
    player2: "Anthony Davis",
    metric: "Historical Load",
    player1Value: 85,
    player2Value: 92,
    difference: -7,
  },
  {
    player1: "Austin Reaves",
    player2: "D'Angelo Russell",
    metric: "Injury Risk",
    player1Value: 42,
    player2Value: 55,
    difference: -13,
  },
]

export const injuryPredictions: InjuryPrediction[] = [
  {
    player: "Anthony Davis",
    predictedRisk: 78,
    confidence: 85,
    factors: ["High historical load", "Recent injury history", "Schedule stress"],
    recommendedAction: "Reduce minutes by 15% next 3 games",
  },
  {
    player: "LeBron James",
    predictedRisk: 72,
    confidence: 75,
    factors: ["Age factor", "Accumulated minutes", "Back-to-back games"],
    recommendedAction: "Limit to 30 minutes in back-to-back scenarios",
  },
]

export const performanceTrends: PerformanceTrend[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
  riskScore: 50 + Math.sin(i * 0.2) * 20 + Math.random() * 10,
  minutes: 28 + Math.floor(Math.random() * 12),
  efficiency: 0.55 + Math.random() * 0.15,
}))
