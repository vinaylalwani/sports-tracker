import { playerHistoryData } from "./playerHistoryData";

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

/** Map common injury keywords to body regions */
const injuryToRegion: Record<string, { regionId: BodyRegionId; label: string }[]> = {
  knee: [
    { regionId: "knee_l", label: "Left Knee" },
    { regionId: "knee_r", label: "Right Knee" },
  ],
  ankle: [
    { regionId: "ankle_l", label: "Left Ankle" },
    { regionId: "ankle_r", label: "Right Ankle" },
  ],
  hamstring: [
    { regionId: "hamstring_l", label: "Left Hamstring" },
    { regionId: "hamstring_r", label: "Right Hamstring" },
  ],
  shoulder: [
    { regionId: "shoulder_l", label: "Left Shoulder" },
    { regionId: "shoulder_r", label: "Right Shoulder" },
  ],
  back: [{ regionId: "back_lower", label: "Lower Back" }],
  spine: [{ regionId: "back_upper", label: "Upper Back" }],
  hip: [
    { regionId: "hip_l", label: "Left Hip" },
    { regionId: "hip_r", label: "Right Hip" },
  ],
  wrist: [
    { regionId: "wrist_l", label: "Left Wrist" },
    { regionId: "wrist_r", label: "Right Wrist" },
  ],
  hand: [
    { regionId: "wrist_l", label: "Left Hand" },
    { regionId: "wrist_r", label: "Right Hand" },
  ],
  elbow: [
    { regionId: "elbow_l", label: "Left Elbow" },
    { regionId: "elbow_r", label: "Right Elbow" },
  ],
  head: [{ regionId: "head", label: "Head" }],
  eye: [{ regionId: "head", label: "Eye" }],
  face: [{ regionId: "head", label: "Face" }],
  jaw: [{ regionId: "head", label: "Jaw" }],
  nose: [{ regionId: "head", label: "Nose" }],
  orbital: [{ regionId: "head", label: "Orbital" }],
  concussion: [{ regionId: "head", label: "Head" }],
  neck: [{ regionId: "neck", label: "Neck" }],
  foot: [
    { regionId: "ankle_l", label: "Left Foot/Ankle" },
    { regionId: "ankle_r", label: "Right Foot/Ankle" },
  ],
  toe: [{ regionId: "ankle_l", label: "Left Toe" }, { regionId: "ankle_r", label: "Right Toe" }],
  calf: [
    { regionId: "hamstring_l", label: "Left Calf" },
    { regionId: "hamstring_r", label: "Right Calf" },
  ],
  groin: [
    { regionId: "hip_l", label: "Left Groin/Hip" },
    { regionId: "hip_r", label: "Right Groin/Hip" },
  ],
  quad: [
    { regionId: "hamstring_l", label: "Left Quad" },
    { regionId: "hamstring_r", label: "Right Quad" },
  ],
  thigh: [
    { regionId: "hamstring_l", label: "Left Thigh" },
    { regionId: "hamstring_r", label: "Right Thigh" },
  ],
  abdomen: [{ regionId: "back_lower", label: "Abdomen/Core" }],
  abdominal: [{ regionId: "back_lower", label: "Abdomen/Core" }],
  core: [{ regionId: "back_lower", label: "Core" }],
  leg: [{ regionId: "knee_l", label: "Left Leg" }, { regionId: "knee_r", label: "Right Leg" }],
  shin: [{ regionId: "knee_l", label: "Left Shin" }, { regionId: "knee_r", label: "Right Shin" }],
  achilles: [{ regionId: "ankle_l", label: "Left Achilles" }, { regionId: "ankle_r", label: "Right Achilles" }],
  arm: [{ regionId: "elbow_l", label: "Left Arm" }, { regionId: "elbow_r", label: "Right Arm" }],
  finger: [{ regionId: "wrist_l", label: "Left Finger" }, { regionId: "wrist_r", label: "Right Finger" }],
  thumb: [{ regionId: "wrist_l", label: "Left Thumb" }, { regionId: "wrist_r", label: "Right Thumb" }],
  rib: [{ regionId: "back_upper", label: "Ribs" }],
  chest: [{ regionId: "back_upper", label: "Chest" }],
  pelvis: [{ regionId: "hip_l", label: "Pelvis" }],
};

/**
 * Given a player name, derive body-region risks from their injury history.
 * Checks body_part, bodyPart, type, description, and name fields.
 */
export function getPlayerBodyRegionRisks(playerName: string): BodyRegionRisk[] {
  const player = playerHistoryData.find((p) => p.name === playerName);
  if (!player) return [];

  const regionRiskMap = new Map<BodyRegionId, { label: string; risk: number }>();

  for (const injury of player.injuries) {
    const inj = injury as any;

    // Combine all text fields that might describe the injury location
    const textParts = [
      inj.body_part,
      inj.bodyPart,
      inj.type,
      inj.description,
      inj.name,
      inj.injury,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    // If no text at all, skip
    if (!textParts.trim()) continue;

    const gamesMissed: number = inj.gamesMissed ?? inj.games_missed ?? 5;

    // Check for left/right specificity
    const isLeft = textParts.includes("left");
    const isRight = textParts.includes("right");

    let matched = false;
    for (const [keyword, regions] of Object.entries(injuryToRegion)) {
      if (textParts.includes(keyword)) {
        matched = true;
        // Pick region based on left/right, or default to first
        let region = regions[0];
        if (regions.length > 1) {
          if (isRight) region = regions[1];
          else if (isLeft) region = regions[0];
          // If neither specified, use first (left) by default
        }

        const existing = regionRiskMap.get(region.regionId);
        const addedRisk = Math.min(20 + gamesMissed * 2, 45);
        if (existing) {
          existing.risk = parseFloat(Math.min(existing.risk + addedRisk, 100).toFixed(2));
        } else {
          regionRiskMap.set(region.regionId, {
            label: region.label,
            risk: parseFloat(Math.min(addedRisk, 100).toFixed(2)),
          });
        }
      }
    }

    // If no keyword matched, try to use the body_part text directly as a general region
    if (!matched && inj.body_part) {
      const fallbackRegionId: BodyRegionId = "back_lower";
      const existing = regionRiskMap.get(fallbackRegionId);
      const addedRisk = Math.min(15 + gamesMissed, 30);
      if (existing) {
        existing.risk = parseFloat(Math.min(existing.risk + addedRisk, 100).toFixed(2));
      } else {
        regionRiskMap.set(fallbackRegionId, {
          label: (inj.body_part as string).charAt(0).toUpperCase() + (inj.body_part as string).slice(1),
          risk: parseFloat(Math.min(addedRisk, 100).toFixed(2)),
        });
      }
    }
  }

  return Array.from(regionRiskMap.entries())
    .map(([regionId, { label, risk }]) => ({ regionId, label, risk }))
    .sort((a, b) => b.risk - a.risk);
}

export const allPlayerBodyRisks: Record<string, BodyRegionRisk[]> = {};
for (const player of playerHistoryData) {
  const id = player.name.toLowerCase().replace(/\s+/g, "-");
  allPlayerBodyRisks[id] = getPlayerBodyRegionRisks(player.name);
}
