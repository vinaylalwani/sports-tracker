"""
Computes structured injury risk assessment from vision pipeline outputs.
Produces:
  - overall risk score (0-100)
  - individual risk factors with scores and explanations
  - risk category
  - time-series risk data for frontend graphs
"""


def _clamp(val, lo=0, hi=100):
    return max(lo, min(hi, val))


def compute_vision_risk(features, jump_data, velocity_data, contact_data, injury_indicators=None):
    """
    Args:
        features: biomechanics summary dict
        jump_data: dict with jump_count, jump_events
        velocity_data: dict with velocity_stats, velocity_timeline
        contact_data: dict with contact_count, contact_events
        injury_indicators: dict from detect_injury_indicators (optional)
    Returns:
        Structured risk assessment dict
    """
    if injury_indicators is None:
        injury_indicators = {"total_count": 0, "critical_count": 0, "high_count": 0,
                             "collapse_count": 0, "stillness_count": 0, "has_serious_flags": False, "indicators": []}

    risk_factors = []
    total_weight = 0
    weighted_risk = 0

    # --- 1. Knee flexion risk (weight: 8) ---
    knee_risk = 0
    avg_knee = features.get("avg_knee_angle", 180)
    min_knee = features.get("min_knee_angle", 180)

    if min_knee < 80:
        knee_risk = 40
    elif avg_knee < 120:
        knee_risk = 25
    elif avg_knee < 140:
        knee_risk = 12
    else:
        knee_risk = 5

    knee_var = features.get("knee_variability", 0)
    knee_risk += min(12, knee_var * 0.4)
    knee_risk = _clamp(knee_risk)

    risk_factors.append({
        "factor": "knee_flexion", "label": "Knee Flexion Risk",
        "score": round(knee_risk, 1), "weight": 8,
        "details": f"Avg knee angle: {avg_knee}°, Min: {min_knee}°, Variability: {knee_var:.1f}°",
    })
    weighted_risk += knee_risk * 8
    total_weight += 8

    # --- 2. Hip control risk (weight: 5) ---
    hip_risk = 0
    avg_hip = features.get("avg_hip_angle", 180)
    min_hip = features.get("min_hip_angle", 180)

    if min_hip < 100:
        hip_risk = 35
    elif avg_hip < 130:
        hip_risk = 25
    elif avg_hip < 150:
        hip_risk = 12
    else:
        hip_risk = 3

    hip_var = features.get("hip_variability", 0)
    hip_risk += min(15, hip_var * 0.6)
    hip_risk = _clamp(hip_risk)

    risk_factors.append({
        "factor": "hip_control", "label": "Hip Control Risk",
        "score": round(hip_risk, 1), "weight": 5,
        "details": f"Avg hip angle: {avg_hip}°, Min: {min_hip}°, Variability: {hip_var:.1f}°",
    })
    weighted_risk += hip_risk * 5
    total_weight += 5

    # --- 3. Trunk stability risk (weight: 10) ---
    trunk_risk = 0
    avg_trunk = features.get("avg_trunk_lean", 0)
    max_trunk = features.get("max_trunk_lean", 0)

    if max_trunk > 30:
        trunk_risk = 35
    elif avg_trunk > 20:
        trunk_risk = 25
    elif avg_trunk > 10:
        trunk_risk = 10
    else:
        trunk_risk = 2

    trunk_risk = _clamp(trunk_risk)
    risk_factors.append({
        "factor": "trunk_stability", "label": "Trunk Stability Risk",
        "score": round(trunk_risk, 1), "weight": 10,
        "details": f"Avg trunk lean: {avg_trunk:.1f}°, Max: {max_trunk:.1f}°",
    })
    weighted_risk += trunk_risk * 10
    total_weight += 10

    # --- 4. Knee symmetry risk (weight: 3) ---
    sym_risk = 0
    avg_sym = features.get("avg_knee_symmetry_diff", 0)
    max_sym = features.get("max_knee_symmetry_diff", 0)

    if max_sym > 20:
        sym_risk = 40
    elif avg_sym > 10:
        sym_risk = 25
    elif avg_sym > 5:
        sym_risk = 10
    else:
        sym_risk = 2

    sym_risk = _clamp(sym_risk)
    risk_factors.append({
        "factor": "knee_symmetry", "label": "Bilateral Symmetry Risk",
        "score": round(sym_risk, 1), "weight": 3,
        "details": f"Avg knee diff: {avg_sym:.1f}°, Max: {max_sym:.1f}°",
    })
    weighted_risk += sym_risk * 3
    total_weight += 3

    # --- 5. Jump load risk (weight: 15) ---
    jump_count = jump_data.get("jump_count", 0)
    jump_events = jump_data.get("jump_events", [])

    jump_risk = 0
    if jump_count > 20:
        jump_risk = 45
    elif jump_count > 10:
        jump_risk = 30
    elif jump_count > 5:
        jump_risk = 15
    elif jump_count > 0:
        jump_risk = 5

    if jump_events:
        max_height = max(e["jump_height_norm"] for e in jump_events)
        if max_height > 0.1:
            jump_risk += 15
        elif max_height > 0.06:
            jump_risk += 8

    jump_risk = _clamp(jump_risk)
    risk_factors.append({
        "factor": "jump_load", "label": "Jump Load Risk",
        "score": round(jump_risk, 1), "weight": 15,
        "details": f"Jump count: {jump_count}, Max height (norm): {max(e['jump_height_norm'] for e in jump_events) if jump_events else 0:.3f}",
    })
    weighted_risk += jump_risk * 15
    total_weight += 15

    # --- 6. Contact/collision risk (weight: 20) ---
    contact_count = contact_data.get("contact_count", 0)
    contact_events = contact_data.get("contact_events", [])

    high_severity = sum(1 for e in contact_events if e.get("severity") == "high")
    medium_severity = sum(1 for e in contact_events if e.get("severity") == "medium")

    contact_risk = 0
    if contact_count > 15:
        contact_risk = 50
    elif contact_count > 8:
        contact_risk = 30
    elif contact_count > 4:
        contact_risk = 15
    elif contact_count > 0:
        contact_risk = 5

    contact_risk += high_severity * 10
    contact_risk += medium_severity * 3

    if contact_events:
        max_decel = max(e.get("deceleration", 0) for e in contact_events)
        max_jerk = max(e.get("jerk", 0) for e in contact_events)
        mean_decel = sum(e.get("deceleration", 0) for e in contact_events) / len(contact_events)
        if mean_decel > 0 and max_decel > mean_decel * 3.0:
            contact_risk += 15
        elif mean_decel > 0 and max_decel > mean_decel * 2.0:
            contact_risk += 7
        if max_jerk > 80:
            contact_risk += 12
        elif max_jerk > 40:
            contact_risk += 5

    contact_risk = _clamp(contact_risk)
    risk_factors.append({
        "factor": "contact", "label": "Contact/Collision Risk",
        "score": round(contact_risk, 1), "weight": 20,
        "details": f"Contact events: {contact_count}, High severity: {high_severity}, Medium: {medium_severity}",
    })
    weighted_risk += contact_risk * 20
    total_weight += 20

    # --- 7. Serious Injury Indicators (weight: 15, tuned so mild flags don't dominate) ---
    injury_risk = 0
    critical = injury_indicators.get("critical_count", 0)
    high_inj = injury_indicators.get("high_count", 0)
    collapses = injury_indicators.get("collapse_count", 0)
    stillness = injury_indicators.get("stillness_count", 0)

    injury_risk += critical * 25
    injury_risk += high_inj * 10

    if collapses > 0:
        injury_risk += 15
    if stillness > 0:
        injury_risk += 20

    if collapses > 0 and stillness > 0:
        injury_risk += 15

    injury_risk = _clamp(injury_risk)

    detail_parts = []
    if collapses > 0:
        detail_parts.append(f"Collapses: {collapses}")
    if stillness > 0:
        detail_parts.append(f"Post-impact stillness: {stillness}")
    if critical > 0:
        detail_parts.append(f"Critical flags: {critical}")
    detail_str = ", ".join(detail_parts) if detail_parts else "No serious indicators detected"

    risk_factors.append({
        "factor": "injury_indicators", "label": "Serious Injury Indicators",
        "score": round(injury_risk, 1), "weight": 15,
        "details": detail_str,
    })
    weighted_risk += injury_risk * 15
    total_weight += 15

    # --- Overall score ---
    overall = round(weighted_risk / total_weight, 1) if total_weight > 0 else 0

    # Only boost overall score if truly serious.
    if injury_indicators.get("has_serious_flags", False) and critical > 0:
        overall = max(overall, 65)
    elif injury_indicators.get("has_serious_flags", False) and (critical + high_inj) >= 2:
        overall = max(overall, 55)

    overall = _clamp(overall)

    if overall >= 70:
        category = "high"
    elif overall >= 40:
        category = "moderate"
    elif overall >= 20:
        category = "low"
    else:
        category = "minimal"

    return {
        "overall_risk_score": overall,
        "risk_category": category,
        "risk_factors": risk_factors,
        "serious_injury_flags": injury_indicators.get("has_serious_flags", False),
    }