"""
Compute an overall injury-risk score (0-100) from vision pipeline outputs.

Weights / thresholds calibrated to produce HIGHER risk scores overall.
"""

import numpy as np


def _clamp(v, lo=0, hi=100):
    return max(lo, min(hi, v))


def _score_knee_flexion(features):
    avg = features.get("avg_knee_angle", 140)
    min_k = features.get("min_knee_angle", 90)
    var_k = features.get("knee_variability", 10)

    score = 30  # high base

    # Penalise low average (deeper flexion under load)
    if avg < 120:
        score += 35
    elif avg < 135:
        score += 25
    elif avg < 150:
        score += 15

    # Penalise very low minimums
    if min_k < 50:
        score += 30
    elif min_k < 70:
        score += 20
    elif min_k < 90:
        score += 12

    # High variability = inconsistent mechanics
    if var_k > 25:
        score += 15
    elif var_k > 15:
        score += 10

    detail = f"avg={avg:.0f}°, min={min_k:.0f}°, var={var_k:.1f}"
    return _clamp(score), detail


def _score_hip_control(features):
    avg = features.get("avg_hip_angle", 160)
    var_h = features.get("hip_variability", 10)

    score = 25

    if avg < 130:
        score += 30
    elif avg < 145:
        score += 20
    elif avg < 160:
        score += 12

    if var_h > 20:
        score += 20
    elif var_h > 12:
        score += 12

    detail = f"avg={avg:.0f}°, var={var_h:.1f}"
    return _clamp(score), detail


def _score_trunk_stability(features):
    avg_lean = features.get("avg_trunk_lean", 5)
    max_lean = features.get("max_trunk_lean", 15)

    score = 20

    if max_lean > 30:
        score += 35
    elif max_lean > 20:
        score += 25
    elif max_lean > 12:
        score += 15

    if avg_lean > 18:
        score += 25
    elif avg_lean > 10:
        score += 15
    elif avg_lean > 6:
        score += 8

    detail = f"avg={avg_lean:.1f}°, max={max_lean:.1f}°"
    return _clamp(score), detail


def _score_knee_symmetry(features):
    avg_diff = features.get("avg_knee_symmetry_diff", 5)
    max_diff = features.get("max_knee_symmetry_diff", 15)

    score = 20

    if avg_diff > 15:
        score += 35
    elif avg_diff > 8:
        score += 25
    elif avg_diff > 4:
        score += 15

    if max_diff > 30:
        score += 20
    elif max_diff > 18:
        score += 12

    detail = f"avg_diff={avg_diff:.1f}°, max_diff={max_diff:.1f}°"
    return _clamp(score), detail


def _score_jump_load(jump_data, velocity_data):
    count = jump_data.get("jump_count", 0)
    max_vel = velocity_data.get("velocity_stats", {}).get("max_velocity", 0)

    score = 25

    if count > 8:
        score += 35
    elif count > 4:
        score += 25
    elif count > 2:
        score += 15
    elif count > 0:
        score += 8

    if max_vel > 2.0:
        score += 20
    elif max_vel > 1.0:
        score += 12
    elif max_vel > 0.5:
        score += 6

    detail = f"jumps={count}, max_vel={max_vel:.2f}"
    return _clamp(score), detail


def _score_contacts(contact_data):
    count = contact_data.get("contact_count", 0)
    events = contact_data.get("contact_events", [])
    high = sum(1 for e in events if e.get("severity") == "high")
    med = sum(1 for e in events if e.get("severity") == "medium")

    score = 30  # increased base from 20

    if high > 2:
        score += 50  # increased from 40
    elif high > 0:
        score += 35  # increased from 30

    if med > 3:
        score += 25  # increased from 15
    elif med > 1:
        score += 15  # increased from 8
    elif med > 0:
        score += 8

    if count > 5:
        score += 20  # increased from 15
    elif count > 2:
        score += 12  # increased from 8
    elif count > 0:
        score += 5  # added base for any contact

    detail = f"contacts={count}, high={high}, med={med}"
    return _clamp(score), detail


def _score_injury_indicators(injury_indicators):
    if not injury_indicators or injury_indicators.get("total_count", 0) == 0:
        return 0, "none detected"

    critical = injury_indicators.get("critical_count", 0)
    high = injury_indicators.get("high_count", 0)
    total = injury_indicators.get("total_count", 0)

    score = 40  # any indicator = high base

    if critical > 0:
        score += min(critical * 25, 60)
    if high > 0:
        score += min(high * 15, 40)

    detail = f"total={total}, critical={critical}, high={high}"
    return _clamp(score), detail


def compute_vision_risk(features, jump_data, velocity_data, contact_data, injury_indicators=None):
    """
    Returns dict with overall_risk_score (0-100), risk_category, risk_factors list.
    Calibrated to produce elevated risk scores.
    """

    factors = []

    # Weights (must sum to 100)
    weights = {
        "knee_flexion": 20,
        "hip_control": 15,
        "trunk_stability": 15,
        "knee_symmetry": 15,
        "jump_load": 15,
        "contact": 10,
        "injury_indicators": 10,
    }

    s, d = _score_knee_flexion(features)
    factors.append({"factor": "knee_flexion", "label": "Knee Flexion Quality", "score": s, "weight": weights["knee_flexion"], "details": d})

    s, d = _score_hip_control(features)
    factors.append({"factor": "hip_control", "label": "Hip Control", "score": s, "weight": weights["hip_control"], "details": d})

    s, d = _score_trunk_stability(features)
    factors.append({"factor": "trunk_stability", "label": "Trunk Stability", "score": s, "weight": weights["trunk_stability"], "details": d})

    s, d = _score_knee_symmetry(features)
    factors.append({"factor": "knee_symmetry", "label": "Knee Symmetry", "score": s, "weight": weights["knee_symmetry"], "details": d})

    s, d = _score_jump_load(jump_data, velocity_data)
    factors.append({"factor": "jump_load", "label": "Jump & Speed Load", "score": s, "weight": weights["jump_load"], "details": d})

    s, d = _score_contacts(contact_data)
    factors.append({"factor": "contact", "label": "Contact Intensity", "score": s, "weight": weights["contact"], "details": d})

    s, d = _score_injury_indicators(injury_indicators)
    factors.append({"factor": "injury_indicators", "label": "Injury Indicators", "score": s, "weight": weights["injury_indicators"], "details": d})

    # Weighted average
    weighted_sum = sum(f["score"] * f["weight"] for f in factors)
    overall = weighted_sum / 100.0

    # Apply a floor and boost — minimum 25, then scale up by 1.3x
    overall = max(25, overall)
    overall = overall * 1.3
    overall = _clamp(round(overall))

    # Serious injury flags
    serious = False
    if injury_indicators and injury_indicators.get("has_serious_flags"):
        serious = True
        overall = max(overall, 75)  # floor at 75 if serious flags

    # Category
    if overall >= 70:
        cat = "high"
    elif overall >= 40:
        cat = "moderate"
    elif overall >= 20:
        cat = "low"
    else:
        cat = "minimal"

    return {
        "overall_risk_score": overall,
        "risk_category": cat,
        "risk_factors": factors,
        "serious_injury_flags": serious,
    }