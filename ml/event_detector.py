"""
Detects athletic events from pose keypoint sequences:
  - Jumps (vertical displacement of hips)
  - Velocity (center-of-mass displacement per frame)
  - Contact approximation (sudden deceleration / jerk)
  - Serious injury indicators (collapse, hyperextension, post-impact stillness)
"""

import numpy as np
from scipy.signal import find_peaks

LEFT_HIP, RIGHT_HIP = 23, 24
LEFT_KNEE, RIGHT_KNEE = 25, 26
LEFT_ANKLE, RIGHT_ANKLE = 27, 28
LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_ELBOW, RIGHT_ELBOW = 13, 14
LEFT_WRIST, RIGHT_WRIST = 15, 16


def _midpoint(kp, idx_a, idx_b):
    return (kp[idx_a][:2] + kp[idx_b][:2]) / 2.0


def _angle_between(a, b, c):
    """Angle at point b formed by points a-b-c, using x,y only."""
    a = np.array(a[:2])
    b = np.array(b[:2])
    c = np.array(c[:2])
    ba = a - b
    bc = c - b
    cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6)
    return np.degrees(np.arccos(np.clip(cos_angle, -1.0, 1.0)))


def compute_center_of_mass(keypoints_sequence):
    return np.array([_midpoint(kp, LEFT_HIP, RIGHT_HIP) for kp in keypoints_sequence])


def detect_jumps(keypoints_sequence, effective_fps, min_jump_height=0.03, min_prominence=0.015):
    if len(keypoints_sequence) < 5:
        return 0, []

    hip_y = np.array([_midpoint(kp, LEFT_HIP, RIGHT_HIP)[1] for kp in keypoints_sequence])

    kernel_size = max(3, int(effective_fps * 0.1))
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel = np.ones(kernel_size) / kernel_size
    hip_y_smooth = np.convolve(hip_y, kernel, mode="same")

    inverted = -hip_y_smooth
    min_distance = max(3, int(effective_fps * 0.3))
    peaks, _ = find_peaks(inverted, prominence=min_prominence, distance=min_distance)

    baseline = np.median(hip_y_smooth)
    jump_events = []
    for peak_idx in peaks:
        jump_height = baseline - hip_y_smooth[peak_idx]
        if jump_height < min_jump_height:
            continue

        search_end = min(peak_idx + int(effective_fps * 1.0), len(hip_y_smooth))
        segment = hip_y_smooth[peak_idx:search_end]
        landing_idx = peak_idx + (np.argmax(segment) if len(segment) > 1 else 0)

        jump_events.append({
            "frame_seq_idx": int(peak_idx),
            "timestamp": round(float(peak_idx / effective_fps), 3),
            "jump_height_norm": round(float(jump_height), 4),
            "landing_seq_idx": int(landing_idx),
            "landing_timestamp": round(float(landing_idx / effective_fps), 3),
        })

    return len(jump_events), jump_events


def estimate_velocity(keypoints_sequence, effective_fps):
    coms = compute_center_of_mass(keypoints_sequence)
    if len(coms) < 2:
        return np.array([]), {"max_velocity": 0, "mean_velocity": 0, "std_velocity": 0}, []

    dt = 1.0 / effective_fps
    speeds = np.linalg.norm(np.diff(coms, axis=0), axis=1) / dt
    kernel = np.ones(3) / 3
    speeds_smooth = np.convolve(speeds, kernel, mode="same")

    timeline = [
        {"timestamp": round(float((i + 0.5) / effective_fps), 3), "velocity": round(float(v), 4)}
        for i, v in enumerate(speeds_smooth)
    ]
    stats = {
        "max_velocity": round(float(np.max(speeds_smooth)), 4),
        "mean_velocity": round(float(np.mean(speeds_smooth)), 4),
        "std_velocity": round(float(np.std(speeds_smooth)), 4),
    }
    return speeds_smooth, stats, timeline


def detect_contacts(keypoints_sequence, effective_fps, decel_threshold=None):
    coms = compute_center_of_mass(keypoints_sequence)
    if len(coms) < 4:
        return 0, []

    dt = 1.0 / effective_fps
    speeds = np.linalg.norm(np.diff(coms, axis=0), axis=1) / dt
    if len(speeds) < 3:
        return 0, []

    accel = np.diff(speeds) / dt
    jerk = np.diff(accel) / dt

    abs_jerk = np.abs(jerk)
    abs_accel = np.abs(accel)

    if decel_threshold is None:
        decel_threshold = float(np.mean(abs_jerk) + 2.5 * np.std(abs_jerk))
    accel_threshold = float(np.mean(abs_accel) + 2.5 * np.std(abs_accel))

    min_gap = max(3, int(effective_fps * 0.5))
    jerk_peaks, _ = find_peaks(abs_jerk, height=decel_threshold, distance=min_gap)
    decel_peaks, _ = find_peaks(abs_accel, height=accel_threshold, distance=min_gap)

    all_peaks = sorted(set(jerk_peaks.tolist()) | {p + 1 for p in decel_peaks.tolist()})
    merged = []
    for p in all_peaks:
        if not merged or (p - merged[-1]) >= min_gap:
            merged.append(p)

    contact_events = []
    for idx in merged:
        jerk_val = float(abs_jerk[idx]) if idx < len(abs_jerk) else 0
        accel_val = float(abs_accel[min(idx, len(abs_accel) - 1)])
        severity = "high" if jerk_val > decel_threshold * 1.5 or accel_val > accel_threshold * 1.5 else (
            "medium" if jerk_val > decel_threshold or accel_val > accel_threshold else "low"
        )
        contact_events.append({
            "frame_seq_idx": int(idx),
            "timestamp": round(float(idx / effective_fps), 3),
            "deceleration": round(accel_val, 2),
            "jerk": round(jerk_val, 2),
            "severity": severity,
        })

    return len(contact_events), contact_events


def compute_ankle_ground_proximity(keypoints_sequence, effective_fps, ground_threshold=0.92):
    return [
        {
            "timestamp": round(float(i / effective_fps), 3),
            "on_ground": bool(max(kp[LEFT_ANKLE][1], kp[RIGHT_ANKLE][1]) >= ground_threshold),
            "ankle_y": round(float(max(kp[LEFT_ANKLE][1], kp[RIGHT_ANKLE][1])), 4),
        }
        for i, kp in enumerate(keypoints_sequence)
    ]


# ============================================================
# SERIOUS INJURY INDICATORS
# ============================================================

def detect_body_collapse(keypoints_sequence, effective_fps):
    """
    Detect sudden drops in shoulder/hip height indicating a player
    falling or collapsing (e.g., after a hard foul, ankle roll, knee buckle).
    
    A collapse = rapid downward movement of both shoulders and hips
    over a short window (2-4 frames).
    """
    if len(keypoints_sequence) < 5:
        return []

    shoulder_y = []
    hip_y = []
    for kp in keypoints_sequence:
        mid_s = _midpoint(kp, LEFT_SHOULDER, RIGHT_SHOULDER)
        mid_h = _midpoint(kp, LEFT_HIP, RIGHT_HIP)
        shoulder_y.append(mid_s[1])
        hip_y.append(mid_h[1])

    shoulder_y = np.array(shoulder_y)
    hip_y = np.array(hip_y)

    # Body height = distance between shoulders and hips (should stay roughly constant)
    body_height = np.abs(shoulder_y - hip_y)

    # Rate of downward movement (positive = moving down in image coords)
    dt = 1.0 / effective_fps
    shoulder_vel = np.diff(shoulder_y) / dt  # positive = falling
    hip_vel = np.diff(hip_y) / dt

    # Collapse = both shoulders AND hips moving down rapidly
    combined_fall_rate = (shoulder_vel + hip_vel) / 2.0

    # Also detect body height compression (crumpling)
    height_change = np.diff(body_height) / dt

    # Thresholds (adaptive)
    fall_threshold = float(np.mean(np.abs(combined_fall_rate)) + 3.0 * np.std(np.abs(combined_fall_rate)))
    fall_threshold = max(fall_threshold, 0.3)  # minimum absolute threshold

    collapse_events = []
    min_gap = max(2, int(effective_fps * 0.5))

    for i in range(len(combined_fall_rate)):
        is_falling = combined_fall_rate[i] > fall_threshold
        # Also check if body is compressing (height shrinking)
        is_compressing = i < len(height_change) and height_change[i] < -fall_threshold * 0.3

        if is_falling or (is_falling and is_compressing):
            # Check it's not too close to a previous event
            if collapse_events and (i - collapse_events[-1]["frame_seq_idx"]) < min_gap:
                continue

            # Look ahead: does the player stay down? (sustained low position)
            look_ahead = min(i + int(effective_fps * 1.0), len(shoulder_y))
            stayed_down = False
            if look_ahead > i + 2:
                post_shoulder = np.mean(shoulder_y[i+1:look_ahead])
                pre_shoulder = np.mean(shoulder_y[max(0, i-3):i])
                if post_shoulder > pre_shoulder + 0.02:  # stayed lower
                    stayed_down = True

            severity = "critical" if (is_compressing and stayed_down) else "high" if stayed_down else "moderate"

            collapse_events.append({
                "frame_seq_idx": int(i),
                "timestamp": round(float(i / effective_fps), 3),
                "fall_rate": round(float(combined_fall_rate[i]), 4),
                "stayed_down": stayed_down,
                "severity": severity,
                "type": "collapse",
            })

    return collapse_events


def detect_hyperextension(keypoints_sequence, effective_fps):
    """
    Detect dangerous limb angles that suggest hyperextension:
    - Knee angle > 185° (hyperextended knee — very dangerous)
    - Knee angle < 60° under rapid change (buckling)
    - Sudden large angle changes in a single frame
    """
    if len(keypoints_sequence) < 3:
        return []

    events = []
    prev_lk = None
    prev_rk = None
    min_gap = max(2, int(effective_fps * 0.3))

    for i, kp in enumerate(keypoints_sequence):
        lk = _angle_between(kp[LEFT_HIP], kp[LEFT_KNEE], kp[LEFT_ANKLE])
        rk = _angle_between(kp[RIGHT_HIP], kp[RIGHT_KNEE], kp[RIGHT_ANKLE])

        flags = []

        # Hyperextension (angle > 185 in 2D can manifest as very straight + slight reverse)
        # In practice with normalized coords, near-180 with high velocity change = risky
        if lk > 175 or rk > 175:
            flags.append("near_hyperextension")

        # Buckling (very acute angle)
        if lk < 55 or rk < 55:
            flags.append("severe_flexion")

        # Sudden angle change (whiplash-like)
        if prev_lk is not None:
            lk_delta = abs(lk - prev_lk)
            rk_delta = abs(rk - prev_rk)
            max_delta = max(lk_delta, rk_delta)

            if max_delta > 40:
                flags.append("rapid_angle_change")
            elif max_delta > 25:
                flags.append("moderate_angle_change")

        if flags:
            if not events or (i - events[-1]["frame_seq_idx"]) >= min_gap:
                worst_angle = min(lk, rk)
                severity = "critical" if "severe_flexion" in flags or ("near_hyperextension" in flags and "rapid_angle_change" in flags) else \
                           "high" if "rapid_angle_change" in flags or "near_hyperextension" in flags else "moderate"

                events.append({
                    "frame_seq_idx": int(i),
                    "timestamp": round(float(i / effective_fps), 3),
                    "left_knee_angle": round(float(lk), 1),
                    "right_knee_angle": round(float(rk), 1),
                    "angle_delta": round(float(max(abs(lk - (prev_lk or lk)), abs(rk - (prev_rk or rk)))), 1),
                    "flags": flags,
                    "severity": severity,
                    "type": "hyperextension",
                })

        prev_lk = lk
        prev_rk = rk

    return events


def detect_post_impact_stillness(keypoints_sequence, effective_fps, contact_events):
    """
    After a contact event, check if the player becomes unusually still.
    Stillness after hard impact = potential serious injury (concussion, fracture, etc.)
    
    Checks a 1-2 second window after each high/medium contact for near-zero movement.
    """
    if not contact_events or len(keypoints_sequence) < 5:
        return []

    coms = compute_center_of_mass(keypoints_sequence)
    dt = 1.0 / effective_fps
    speeds = np.linalg.norm(np.diff(coms, axis=0), axis=1) / dt if len(coms) > 1 else np.array([])

    if len(speeds) == 0:
        return []

    baseline_speed = float(np.median(speeds))
    stillness_threshold = max(baseline_speed * 0.15, 0.01)  # 15% of median or min 0.01

    stillness_events = []

    for ce in contact_events:
        if ce.get("severity") not in ("high", "medium"):
            continue

        impact_idx = ce["frame_seq_idx"]
        # Check 0.5s to 2s after impact
        start = impact_idx + max(1, int(effective_fps * 0.3))
        end = min(impact_idx + int(effective_fps * 2.0), len(speeds))

        if start >= end or end - start < 3:
            continue

        post_speeds = speeds[start:end]
        avg_post_speed = float(np.mean(post_speeds))
        min_post_speed = float(np.min(post_speeds))
        still_frames = int(np.sum(post_speeds < stillness_threshold))
        still_ratio = still_frames / len(post_speeds)

        if still_ratio > 0.5 or avg_post_speed < stillness_threshold:
            severity = "critical" if still_ratio > 0.8 else "high" if still_ratio > 0.6 else "moderate"

            stillness_events.append({
                "frame_seq_idx": int(start),
                "timestamp": round(float(start / effective_fps), 3),
                "duration_seconds": round(float((end - start) / effective_fps), 2),
                "still_ratio": round(still_ratio, 2),
                "avg_speed_post_impact": round(avg_post_speed, 4),
                "related_contact_timestamp": ce["timestamp"],
                "severity": severity,
                "type": "post_impact_stillness",
            })

    return stillness_events


def detect_injury_indicators(keypoints_sequence, effective_fps, contact_events):
    """
    Master function: runs all serious injury detectors and returns combined results.
    """
    collapses = detect_body_collapse(keypoints_sequence, effective_fps)
    hyperextensions = detect_hyperextension(keypoints_sequence, effective_fps)
    stillness = detect_post_impact_stillness(keypoints_sequence, effective_fps, contact_events)

    all_indicators = collapses + hyperextensions + stillness
    # Sort by timestamp
    all_indicators.sort(key=lambda x: x["timestamp"])

    # Summary
    critical_count = sum(1 for e in all_indicators if e.get("severity") == "critical")
    high_count = sum(1 for e in all_indicators if e.get("severity") == "high")

    return {
        "indicators": all_indicators,
        "collapse_count": len(collapses),
        "hyperextension_count": len(hyperextensions),
        "stillness_count": len(stillness),
        "critical_count": critical_count,
        "high_count": high_count,
        "total_count": len(all_indicators),
        "has_serious_flags": critical_count > 0 or high_count >= 2,
    }
