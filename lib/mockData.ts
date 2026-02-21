export interface Player {
  id: string
  name: string
  position: string
  riskScore: number
  riskClassification: "Low" | "Moderate" | "High"
  recommendedMinutes: number
  currentMinutes: number
  age: number
  injuryHistory: {
    count: number
    lastInjury: string
    recoveryDays: number[]
  }
  historicalLoad: number
  contactIntensity: number
  gameLoad: number
  trendData: number[]
}

export interface RiskTrendData {
  game: number
  baselineRisk: number
  dynamicRisk: number
  minutes: number
  scheduleStress: number
  gameLoadScore: number
}

export interface ScheduleStress {
  backToBack: boolean
  threeInFour: boolean
  roadTripLength: number
  restDays: number
  scheduleMultiplier: number
}

export interface VideoAnalysis {
  jumpCount: number
  accelerationBursts: number
  movementIntensityScore: number
  contactProxyScore: number
  gameLoadStressScore: number
}

export interface FeatureImportance {
  feature: string
  importance: number
  percentage: number
}

export const players: Player[] = [
  {
    id: "1",
    name: "LeBron James",
    position: "SF",
    riskScore: 68,
    riskClassification: "Moderate",
    recommendedMinutes: 32,
    currentMinutes: 35,
    age: 39,
    injuryHistory: {
      count: 3,
      lastInjury: "2023-12-15",
      recoveryDays: [14, 21, 10],
    },
    historicalLoad: 85,
    contactIntensity: 72,
    gameLoad: 78,
    trendData: [65, 67, 66, 68, 69, 70, 68, 67, 68, 70, 69, 68, 67, 69, 68, 70, 69, 68, 67, 68],
  },
  {
    id: "2",
    name: "Anthony Davis",
    position: "PF/C",
    riskScore: 75,
    riskClassification: "High",
    recommendedMinutes: 28,
    currentMinutes: 34,
    age: 31,
    injuryHistory: {
      count: 5,
      lastInjury: "2024-01-10",
      recoveryDays: [20, 15, 18, 12, 25],
    },
    historicalLoad: 92,
    contactIntensity: 88,
    gameLoad: 85,
    trendData: [72, 73, 74, 75, 76, 75, 74, 75, 76, 75, 74, 75, 76, 75, 74, 75, 76, 75, 74, 75],
  },
  {
    id: "3",
    name: "Austin Reaves",
    position: "SG",
    riskScore: 42,
    riskClassification: "Low",
    recommendedMinutes: 36,
    currentMinutes: 33,
    age: 25,
    injuryHistory: {
      count: 1,
      lastInjury: "2023-11-20",
      recoveryDays: [7],
    },
    historicalLoad: 55,
    contactIntensity: 48,
    gameLoad: 52,
    trendData: [40, 41, 42, 43, 42, 41, 42, 43, 42, 41, 42, 43, 42, 41, 42, 43, 42, 41, 42, 43],
  },
  {
    id: "4",
    name: "D'Angelo Russell",
    position: "PG",
    riskScore: 55,
    riskClassification: "Moderate",
    recommendedMinutes: 30,
    currentMinutes: 32,
    age: 28,
    injuryHistory: {
      count: 2,
      lastInjury: "2023-10-05",
      recoveryDays: [10, 14],
    },
    historicalLoad: 68,
    contactIntensity: 55,
    gameLoad: 62,
    trendData: [53, 54, 55, 56, 55, 54, 55, 56, 55, 54, 55, 56, 55, 54, 55, 56, 55, 54, 55, 56],
  },
  {
    id: "5",
    name: "Rui Hachimura",
    position: "PF",
    riskScore: 48,
    riskClassification: "Low",
    recommendedMinutes: 28,
    currentMinutes: 26,
    age: 26,
    injuryHistory: {
      count: 2,
      lastInjury: "2023-09-15",
      recoveryDays: [12, 8],
    },
    historicalLoad: 58,
    contactIntensity: 52,
    gameLoad: 55,
    trendData: [46, 47, 48, 49, 48, 47, 48, 49, 48, 47, 48, 49, 48, 47, 48, 49, 48, 47, 48, 49],
  },
]

export const riskTrendData: RiskTrendData[] = Array.from({ length: 20 }, (_, i) => ({
  game: i + 1,
  baselineRisk: 60 + Math.sin(i * 0.3) * 10 + Math.random() * 5,
  dynamicRisk: 60 + Math.sin(i * 0.3) * 15 + Math.random() * 8,
  minutes: 28 + Math.floor(Math.random() * 10),
  scheduleStress: 1.0 + Math.random() * 0.5,
  gameLoadScore: 50 + Math.random() * 30,
}))

export const scheduleStress: ScheduleStress = {
  backToBack: true,
  threeInFour: false,
  roadTripLength: 3,
  restDays: 1,
  scheduleMultiplier: 1.35,
}

export const videoAnalysis: VideoAnalysis = {
  jumpCount: 127,
  accelerationBursts: 89,
  movementIntensityScore: 78,
  contactProxyScore: 82,
  gameLoadStressScore: 75,
}

export const featureImportance: FeatureImportance[] = [
  { feature: "Historical Load", importance: 28, percentage: 28 },
  { feature: "Injury History Weight", importance: 22, percentage: 22 },
  { feature: "Contact Intensity", importance: 18, percentage: 18 },
  { feature: "Schedule Stress", importance: 15, percentage: 15 },
  { feature: "Game Load", importance: 12, percentage: 12 },
  { feature: "Age Factor", importance: 5, percentage: 5 },
]

export const teamAvailability = {
  averageRisk: 57.6,
  projectedAvailability: 85,
  playoffReadiness: 78,
}
