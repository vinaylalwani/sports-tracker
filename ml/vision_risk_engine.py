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


def compute_vision_risk(features, jump_data, velocity_data, contact_data):
    """
    Args:
        features: biomechanics summary dict
        jump_data: dict with jump_count, jump_events
        velocity_data: dict with velocity_stats, velocity_timeline
        contact_data: dict with contact_count, contact_events
    Returns:
        Structured risk assessment dict
    """
    risk_factors = []
    total_weight = 0
    weighted_risk = 0

    # --- 1. Knee flexion risk ---
    knee_risk = 0
    avg_knee = features.get("avg_knee_angle", 180)
    min_knee = features.get("min_knee_angle", 180)

    if min_knee < 90:
        knee_risk = 40  # deep flexion under load is risky
    elif avg_knee < 130:
        knee_risk = 30
    elif avg_knee < 150:
        knee_risk = 15
    else:
        knee_risk = 5

    # Add variability component
    knee_var = features.get("knee_variability", 0)
    knee_risk += min(20, knee_var * 0.8)

    knee_risk = _clamp(knee_risk)
    risk_factors.append({
        "factor": "knee_flexion",
        "label": "Knee Flexion Risk",
        "score": round(knee_risk, 1),
        "weight": 25,
        "details": f"Avg knee angle: {avg_knee}°, Min: {min_knee}°, Variability: {knee_var:.1f}°",
    })
    weighted_risk += knee_risk * 25
    total_weight += 25

    # --- 2. Hip control risk ---
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
        "factor": "hip_control",
        "label": "Hip Control Risk",
        "score": round(hip_risk, 1),
        "weight": 20,
        "details": f"Avg hip angle: {avg_hip}°, Min: {min_hip}°, Variability: {hip_var:.1f}°",
    })
    weighted_risk += hip_risk * 20
    total_weight += 20

    # --- 3. Trunk stability risk ---
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
        "factor": "trunk_stability",
        "label": "Trunk Stability Risk",
        "score": round(trunk_risk, 1),
        "weight": 10,
        "details": f"Avg trunk lean: {avg_trunk:.1f}°, Max: {max_trunk:.1f}°",
    })
    weighted_risk += trunk_risk * 10
    total_weight += 10

    # --- 4. Knee symmetry risk ---
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
        "factor": "knee_symmetry",
        "label": "Bilateral Symmetry Risk",
        "score": round(sym_risk, 1),
        "weight": 10,
        "details": f"Avg knee diff: {avg_sym:.1f}°, Max: {max_sym:.1f}°",
    })
    weighted_risk += sym_risk * 10
    total_weight += 10

    # --- 5. Jump load risk ---
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

    # High jumps increase risk
    if jump_events:
        max_height = max(e["jump_height_norm"] for e in jump_events)
        if max_height > 0.1:
            jump_risk += 15
        elif max_height > 0.06:
            jump_risk += 8

    jump_risk = _clamp(jump_risk)
    risk_factors.append({
        "factor": "jump_load",
        "label": "Jump Load Risk",
        "score": round(jump_risk, 1),
        "weight": 20,
        "details": f"Jump count: {jump_count}, Max height (norm): {max(e['jump_height_norm'] for e in jump_events) if jump_events else 0:.3f}",
    })
    weighted_risk += jump_risk * 20
    total_weight += 20

    # --- 6. Contact/collision risk ---
    contact_count = contact_data.get("contact_count", 0)
    contact_events = contact_data.get("contact_events", [])

    contact_risk = 0
    if contact_count > 10:
        contact_risk = 50
    elif contact_count > 5:
        contact_risk = 30
    elif contact_count > 2:
        contact_risk = 15
    elif contact_count > 0:
        contact_risk = 5

    # High severity contacts
    high_severity = sum(1 for e in contact_events if e.get("severity") == "high")
    contact_risk += high_severity * 10

    contact_risk = _clamp(contact_risk)
    risk_factors.append({
        "factor": "contact",
        "label": "Contact/Collision Risk",
        "score": round(contact_risk, 1),
        "weight": 15,
        "details": f"Contact events: {contact_count}, High severity: {high_severity}",
    })
    weighted_risk += contact_risk * 15
    total_weight += 15

    # --- Overall score ---
    overall = round(weighted_risk / total_weight, 1) if total_weight > 0 else 0
    overall = _clamp(overall)

    # Category
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
    }