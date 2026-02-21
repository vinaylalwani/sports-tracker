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

# Ensure AGE exists in CSV
if "AGE" not in df.columns:
    raise ValueError("AGE column missing in training_data.csv")

X = df[features]
y = df["INJURY_NEXT"]

# Train/test split (proper validation)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

model = LogisticRegression(class_weight="balanced", max_iter=1000)
model.fit(X_train_scaled, y_train)

train_accuracy = model.score(X_train_scaled, y_train)
test_accuracy = model.score(X_test_scaled, y_test)

print("Training Accuracy:", train_accuracy)
print("Test Accuracy:", test_accuracy)

weights = {
    "intercept": float(model.intercept_[0]),
    "coefficients": {
        feature: float(coef)
        for feature, coef in zip(features, model.coef_[0])
    },
    "scaler_mean": scaler.mean_.tolist(),
    "scaler_scale": scaler.scale_.tolist(),
    "features": features  # IMPORTANT
}

with open("../lib/model_weights.json", "w") as f:
    json.dump(weights, f, indent=2)

print("Model exported to lib/model_weights.json")