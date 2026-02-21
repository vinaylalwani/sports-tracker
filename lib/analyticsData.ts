// lib/analyticsData.ts
import { playerHistoryData, PlayerHistory } from "./playerHistoryData";
import rawWeights from "./model_weights.json";

type ModelWeights = {
  intercept: number;
  coefficients: Record<string, number>;
  scaler_mean: number[];
  scaler_scale: number[];
  features: string[];
};

const weights: ModelWeights = rawWeights as ModelWeights;

/* ================================
   ML Model Helper
================================ */
function standardize(value: number, mean: number, scale: number) {
  return (value - mean) / scale;
}

export function predictRisk(features: {
  MIN_ROLLING_10: number;
  CONTACT_RATE: number;
  AGE: number;
  INJURY_COUNT: number;
}) {
  if (!weights.features || !Array.isArray(weights.features)) {
    console.error("Model features missing or invalid");
    return 50;
  }

  let z = weights.intercept;

  for (let i = 0; i < weights.features.length; i++) {
    const featureName = weights.features[i];
    const coef = weights.coefficients[featureName];

    if (coef === undefined) continue;

    const value = features[featureName as keyof typeof features];

    z += coef * standardize(
      value,
      weights.scaler_mean[i],
      weights.scaler_scale[i]
    );
  }

  const probability = 1 / (1 + Math.exp(-z));
  const calibrated = probability * 60; // compress into 0–60%
  return Math.min(Math.max(calibrated, 3), 65);
}

/* ================================
   Feature Contributions
================================ */
function getRiskContributions(features: {
  MIN_ROLLING_10: number;
  CONTACT_RATE: number;
  AGE: number;
  INJURY_COUNT: number;
}) {
  const contributions: { name: string; value: number }[] = [];

  for (let i = 0; i < weights.features.length; i++) {
    const featureName = weights.features[i];
    const coef = weights.coefficients[featureName];
    if (!coef) continue;

    const value = features[featureName as keyof typeof features];
    const standardized = standardize(value, weights.scaler_mean[i], weights.scaler_scale[i]);
    contributions.push({ name: featureName, value: Math.abs(coef * standardized) });
  }

  return contributions
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((c) => c.name);
}

export type RiskFeatures = {
  MIN_ROLLING_10: number;
  CONTACT_RATE: number;
  AGE: number;
  INJURY_COUNT: number;
};

/**
 * Compute injury prediction from model features (same logic as analytics / injuryPredictions).
 * Use this to drive player dashboard risk from the AI model.
 */
export function computePredictionFromFeatures(
  features: RiskFeatures,
  options?: { position?: string; usageRate?: number }
): { predictedRisk: number; factors: string[]; recommendedAction: string } {
  let predictedRisk = predictRisk(features);
  const ageFactor = features.AGE > 32 ? (features.AGE - 32) * 2 : 0;
  predictedRisk = Math.min(predictedRisk + ageFactor, 100);
  predictedRisk = parseFloat(predictedRisk.toFixed(2));

  const topDrivers = getRiskContributions(features);
  const position = options?.position ?? "";
  const usageRate = options?.usageRate ?? 0;

  const factorLabels = topDrivers.map((driver) => {
    switch (driver) {
      case "MIN_ROLLING_10":
        return usageRate > 0 ? `Usage: ${usageRate.toFixed(1)}%` : "Minutes load";
      case "CONTACT_RATE":
        if (position === "C" || position === "PF") return "High contact player";
        return features.CONTACT_RATE > 8
          ? "High contact player"
          : features.CONTACT_RATE < 4
          ? "Low contact player"
          : "Moderate contact player";
      case "AGE":
        return features.AGE > 32 ? "Age factor" : "Prime age";
      case "INJURY_COUNT":
        return "Injury history";
      default:
        return driver;
    }
  });

  return {
    predictedRisk,
    factors: factorLabels,
    recommendedAction:
      predictedRisk > 70
        ? "Reduce minutes by 15%"
        : predictedRisk > 50
        ? "Monitor workload"
        : "No restrictions",
  };
}

/* ================================
   Interfaces
================================ */
export interface PlayerComparison {
  player1: string;
  player2: string;
  metric: string;
  player1Value: number;
  player2Value: number;
  difference: number;
}

export interface InjuryPrediction {
  player: string;
  predictedRisk: number;
  factors: string[];
  recommendedAction: string;
}

export interface PerformanceTrend {
  player: string;
  date: string;
  riskScore: number;
  minutes: number;
  efficiency: number;
}

/* ================================
   Baseline Risk
================================ */
export const baselineRiskData = playerHistoryData.map((player) => {
  const minRolling10 = player.rollingMin?.length
    ? player.rollingMin.reduce((a, b) => a + b, 0) / player.rollingMin.length
    : player.minutesPerGame.year3;

  const risk = predictRisk({
    MIN_ROLLING_10: minRolling10,
    CONTACT_RATE: player.contactRate,
    AGE: player.age,
    INJURY_COUNT: player.injuries.length,
  });

  return { 
    name: player.name, 
    baselineRisk: parseFloat(risk.toFixed(2)) 
  };
});

/* ================================
   Player Comparisons
================================ */
export const playerComparisons: PlayerComparison[] = baselineRiskData
  .map((player, index) => {
    if (index === 0) return null;
    const first = baselineRiskData[0];
    return {
      player1: first.name,
      player2: player.name,
      metric: "Baseline Injury Risk",
      player1Value: first.baselineRisk,
      player2Value: player.baselineRisk,
      difference: first.baselineRisk - player.baselineRisk,
    };
  })
  .filter(Boolean) as PlayerComparison[];

/* ================================
   Injury Predictions
================================ */
export const injuryPredictions: InjuryPrediction[] = playerHistoryData.map((player) => {
  const minRolling10 = player.rollingMin?.length
    ? player.rollingMin.reduce((a, b) => a + b, 0) / player.rollingMin.length
    : player.minutesPerGame.year3;

  let predictedRisk = predictRisk({
    MIN_ROLLING_10: minRolling10,
    CONTACT_RATE: player.contactRate,
    AGE: player.age,
    INJURY_COUNT: player.injuries.length,
  });

  // Age adjustment
  const ageFactor = player.age > 32 ? (player.age - 32) * 2 : 0;
  predictedRisk = Math.min(predictedRisk + ageFactor, 100);
  predictedRisk = parseFloat(predictedRisk.toFixed(2));

  // Top 3 drivers
  const topDrivers = getRiskContributions({
    MIN_ROLLING_10: minRolling10,
    CONTACT_RATE: player.contactRate,
    AGE: player.age,
    INJURY_COUNT: player.injuries.length,
  });

  const factorLabels = topDrivers.map((driver) => {
    switch (driver) {
      case "MIN_ROLLING_10":
        // Use most recent season usage rate
        const usage = player.usageRate?.year3 ?? 0; // fallback 0 if missing
        return `Usage: ${usage.toFixed(1)}%`;
      case "CONTACT_RATE":
        if (player.position === "C" || player.position === "PF") {
          return "High contact player";
        }
        return player.contactRate > 8
          ? "High contact player"
          : player.contactRate < 4
          ? "Low contact player"
          : "Moderate contact player";
      case "AGE":
        return player.age > 32 ? "Age factor" : "Prime age";
      case "INJURY_COUNT":
        return "Injury History";
      default:
        return driver;
    }
  });

  return {
    player: player.name,
    predictedRisk,
    factors: factorLabels,
    recommendedAction:
      predictedRisk > 70
        ? "Reduce minutes by 15%"
        : predictedRisk > 50
        ? "Monitor workload"
        : "No restrictions",
  };
});

/* ================================
   Performance Trends
================================ */
export const performanceTrends: PerformanceTrend[] = playerHistoryData.flatMap((player) => {
  if (!player.rollingMin || player.rollingMin.length === 0) return [];

  return player.rollingMin.map((minVal, i) => {
    const dailyRisk = predictRisk({
      MIN_ROLLING_10: minVal,
      CONTACT_RATE: player.contactRate,
      AGE: player.age,
      INJURY_COUNT: player.injuries.length,
    });

    return {
      player: player.name,
      date: new Date(2024, 0, i + 1).toISOString().split("T")[0],
      riskScore: parseFloat(dailyRisk.toFixed(2)),
      minutes: minVal,
      efficiency: 0.5 + (100 - dailyRisk) / 200,
    };
  });
});

/* ================================
   Debug
================================ */
console.log("Baseline Risk Data:", baselineRiskData);
console.log("Player Comparisons:", playerComparisons);
console.log("Injury Predictions:", injuryPredictions);
console.log("Performance Trends:", performanceTrends);