// lib/baselineRiskModel.ts

import { PlayerHistory} from "./playerHistoryData";

export interface InjuryRecord {
  year: number;
  category: string; // instead of InjuryCategory
  gamesMissed: number;
  recoveryDays: number;
}

/* ================================
   Injury Severity Weights
================================ */
const injuryWeights: Record<string, number> = {
  minor: 1,
  moderate: 3,
  major: 6,
  chronic: 10,
};

/* ================================
   Helper Functions
================================ */

// Weighted injury score
function calculateInjuryFrequencyScore(player: PlayerHistory) {
  const currentYear = new Date().getFullYear();
  return player.injuries.reduce((acc, injury) => {
    const recencyFactor = Math.max(1, 5 - (currentYear - injury.year)); // recent injuries matter more
    return acc + injuryWeights[injury.category] * recencyFactor;
  }, 0);
}

// Recovery duration normalized
function calculateRecoveryScore(player: PlayerHistory) {
  const totalRecoveryDays = player.injuries.reduce(
    (acc, injury) => acc + injury.recoveryDays,
    0
  );
  return totalRecoveryDays / 50; // scale more aggressively
}

// Minutes load normalized
function calculateMinutesLoad(player: PlayerHistory) {
  const { year1, year2, year3 } = player.minutesPerGame;
  const avgMinutes = (year1 + year2 + year3) / 3;
  return avgMinutes / 36; // NBA players often play ~36 MPG; scale accordingly
}

// Contact rate normalized
function calculateContactRate(player: PlayerHistory) {
  return player.foulsDrawnPerGame + player.foulsCommittedPerGame; // scale later in weighted sum
}

// Age factor: aggressive for >30
function calculateAgeFactor(player: PlayerHistory) {
  return player.age > 30 ? (player.age - 30) * 2 : 0;
}

/* ================================
   Baseline Risk Calculation
================================ */
export function calculateBaselineRisk(player: PlayerHistory): number {
  const injuryFrequency = calculateInjuryFrequencyScore(player);
  const recoveryDuration = calculateRecoveryScore(player);
  const minutesLoad = calculateMinutesLoad(player);
  const contactRate = calculateContactRate(player);
  const ageFactor = calculateAgeFactor(player);

  // Combine all factors with weights
  const baselineRisk =
    injuryFrequency * 0.4 +
    recoveryDuration * 0.25 +
    minutesLoad * 0.2 +
    contactRate * 0.1 +
    ageFactor;

  // Clamp to 0-100 scale
  return Math.min(Math.round(baselineRisk), 100);
}