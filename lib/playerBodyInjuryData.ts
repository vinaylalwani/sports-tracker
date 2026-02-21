/**
 * Maps players to body regions with injury risk (0-100) for the body outline.
 * Derived from risk model, position, and injury history in the codebase.
 */

export type BodyRegionId =
  | "head"
  | "neck"
  | "shoulder_l"
  | "shoulder_r"
  | "back_upper"
  | "back_lower"
  | "elbow_l"
  | "elbow_r"
  | "wrist_l"
  | "wrist_r"
  | "hip_l"
  | "hip_r"
  | "knee_l"
  | "knee_r"
  | "ankle_l"
  | "ankle_r"
  | "hamstring_l"
  | "hamstring_r"

export interface BodyRegionRisk {
  regionId: BodyRegionId
  label: string
  risk: number // 0-100, 0 = no highlight
}

/** Position-based typical injury zones (common in NBA) */
const positionZones: Record<string, BodyRegionId[]> = {
  "SF": ["back_lower", "knee_l", "knee_r", "ankle_l", "ankle_r", "hamstring_l", "hamstring_r"],
  "PF/C": ["back_lower", "back_upper", "knee_l", "knee_r", "ankle_l", "ankle_r", "hip_l", "hip_r"],
  "PF": ["back_lower", "knee_l", "knee_r", "ankle_l", "ankle_r", "hip_l", "hip_r"],
  "SG": ["ankle_l", "ankle_r", "hamstring_l", "hamstring_r", "knee_l", "knee_r"],
  "PG": ["ankle_l", "ankle_r", "hamstring_l", "hamstring_r", "back_lower"],
}

const regionLabels: Record<BodyRegionId, string> = {
  head: "Head",
  neck: "Neck",
  shoulder_l: "Left Shoulder",
  shoulder_r: "Right Shoulder",
  back_upper: "Upper Back",
  back_lower: "Lower Back",
  elbow_l: "Left Elbow",
  elbow_r: "Right Elbow",
  wrist_l: "Left Wrist",
  wrist_r: "Right Wrist",
  hip_l: "Left Hip",
  hip_r: "Right Hip",
  knee_l: "Left Knee",
  knee_r: "Right Knee",
  ankle_l: "Left Ankle",
  ankle_r: "Right Ankle",
  hamstring_l: "Left Hamstring",
  hamstring_r: "Right Hamstring",
}

function stableVariation(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i)
  return 0.85 + (Math.abs(h) % 31) / 100
}

/**
 * Returns body regions with injury risk for a player.
 * Uses player riskScore, position, and injury history count to assign risk per region.
 */
export function getPlayerBodyInjuryRegions(
  playerId: string,
  riskScore: number,
  position: string,
  injuryHistoryCount: number
): BodyRegionRisk[] {
  const zones = positionZones[position] ?? positionZones["SF"]
  const baseRisk = Math.min(100, riskScore + injuryHistoryCount * 4)
  const regions: BodyRegionRisk[] = []

  zones.forEach((regionId, index) => {
    const variation = stableVariation(`${playerId}-${regionId}-${index}`)
    const risk = Math.round(Math.min(100, baseRisk * variation))
    if (risk > 15) {
      regions.push({
        regionId,
        label: regionLabels[regionId],
        risk,
      })
    }
  })

  return regions.sort((a, b) => b.risk - a.risk)
}
