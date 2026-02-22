# vision_risk_engine.py


def compute_vision_risk(features):
    risk = 0

    # Poor landing control
    if features["avg_knee_angle"] < 150:
        risk += 20

    # High variability = instability
    risk += features["knee_variability"] * 0.5

    # Hip control
    if features["avg_hip_angle"] < 140:
        risk += 15

    # Fatigue proxy
    risk += features["movement_variability"] * 0.3

    return max(0, min(100, round(risk, 2)))