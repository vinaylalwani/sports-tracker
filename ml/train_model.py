# ml/train_model.py

import pandas as pd
import numpy as np
import json
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

df = pd.read_csv("data/training_data.csv")

features = [
    "MIN_ROLLING_10",
    "CONTACT_RATE",
    "AGE",
    "INJURY_COUNT"
]

if "AGE" not in df.columns:
    raise ValueError("AGE column missing in training_data.csv")
if "INJURY_NEXT" not in df.columns:
    raise ValueError("INJURY_NEXT column missing in training_data.csv")

X = df[features]
y = df["INJURY_NEXT"]

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train logistic regression
model = LogisticRegression(class_weight="balanced", max_iter=1000)
model.fit(X_train_scaled, y_train)

train_accuracy = model.score(X_train_scaled, y_train)
test_accuracy = model.score(X_test_scaled, y_test)

print("Training Accuracy:", train_accuracy)
print("Test Accuracy:", test_accuracy)

# Export model weights and scaler
weights = {
    "intercept": float(model.intercept_[0]),
    "coefficients": {
        feature: float(coef)
        for feature, coef in zip(features, model.coef_[0])
    },
    "scaler_mean": scaler.mean_.tolist(),
    "scaler_scale": scaler.scale_.tolist(),
    "features": features
}

with open("../lib/model_weights.json", "w") as f:
    json.dump(weights, f, indent=2)

print("Model exported to lib/model_weights.json")

# Optional: save a sample probability for testing frontend
sample_probs = model.predict_proba(X_test_scaled)[:, 1] * 100  # probability of injury next
df_probs = X_test.copy()
df_probs["PredictedRisk"] = sample_probs
df_probs.to_csv("data/sample_predicted_risks.csv", index=False)
print("Sample predicted risks saved to data/sample_predicted_risks.csv")