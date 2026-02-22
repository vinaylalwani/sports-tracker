import type { Game } from "./scheduleData"
import type { RiskTrendData } from "./mockData"

/**
 * Project dynamic risk for the next N games given a baseline risk and average minutes.
 */
export function projectDynamicRisk(
  games: Game[],
  teamBaseline: number,
  avgMinutes: number
): RiskTrendData[] {
  if (games.length === 0) {
    return [
      {
        game: 1,
        baselineRisk: parseFloat(teamBaseline.toFixed(2)),
        dynamicRisk: parseFloat(teamBaseline.toFixed(2)),
        minutes: parseFloat(avgMinutes.toFixed(2)),
        scheduleStress: 1.0,
        gameLoadScore: parseFloat((teamBaseline / 10).toFixed(2)),
      },
    ]
  }

  return games.map((game, i) => {
    const stress = game.stressLevel

    let dynamicRisk = teamBaseline

    if (game.isBackToBack) dynamicRisk += 8
    if (game.isThreeInFour) dynamicRisk += 5
    if (game.restDays === 0 && !game.isBackToBack) dynamicRisk += 3
    if (game.location === "Away") dynamicRisk += 2

    dynamicRisk = dynamicRisk * stress

    const prevHighStress = games
      .slice(0, i)
      .filter((g) => g.stressLevel >= 1.3).length

    dynamicRisk += prevHighStress * 1.5

    dynamicRisk = parseFloat(
      Math.min(Math.max(dynamicRisk, 0), 100).toFixed(2)
    )

    const gameLoadScore = parseFloat(
      ((dynamicRisk * stress) / 10).toFixed(2)
    )

    return {
      game: i + 1,
      baselineRisk: parseFloat(teamBaseline.toFixed(2)),
      dynamicRisk,
      minutes: parseFloat(avgMinutes.toFixed(2)),
      scheduleStress: parseFloat(stress.toFixed(2)),
      gameLoadScore,
      opponent: game.opponent,
      location: game.location,
      date: game.date,
    }
  })
}

/**
 * Combine biomechanical vision risk with baseline model risk
 */
export function combineVisionWithBaseline(
  baselineRisk: number,
  visionRisk: number,
  visionWeight: number = 0.4
): number {
  const safeBaseline = Math.max(0, Math.min(100, baselineRisk))
  const safeVision = Math.max(0, Math.min(100, visionRisk))

  const combined =
    safeBaseline * (1 - visionWeight) +
    safeVision * visionWeight

  return parseFloat(
    Math.min(Math.max(combined, 0), 100).toFixed(2)
  )
}