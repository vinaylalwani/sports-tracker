import weights from "./model_weights.json";

function standardize(value: number, mean: number, scale: number) {
  return (value - mean) / scale;
}

export function predictRisk(features: {
  MIN_ROLLING_10: number;
  CONTACT_RATE: number;
  AGE: number;
}) {
  // Explicitly type the feature keys
  const featureKeys: (keyof typeof features)[] = [
    "MIN_ROLLING_10",
    "CONTACT_RATE",
    "AGE",
  ];

  // Standardize features
  const standardized = featureKeys.map((key, i) =>
    standardize(features[key], weights.scaler_mean[i], weights.scaler_scale[i])
  );

  // Compute weighted sum
  let z = weights.intercept;
  featureKeys.forEach((key, i) => {
    z += weights.coefficients[key] * standardized[i];
  });

  // Logistic output
  return 1 / (1 + Math.exp(-z)); // probability 0–1
}