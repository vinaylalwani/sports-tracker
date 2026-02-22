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

    # Use stricter thresholds to avoid flagging normal movement as contacts
    if decel_threshold is None:
        decel_threshold = float(np.mean(abs_jerk) + 4.0 * np.std(abs_jerk))
    accel_threshold = float(np.mean(abs_accel) + 4.0 * np.std(abs_accel))

    # Minimum absolute thresholds — ignore low-magnitude signals entirely
    min_jerk_threshold = 15.0
    min_accel_threshold = 5.0
    decel_threshold = max(decel_threshold, min_jerk_threshold)
    accel_threshold = max(accel_threshold, min_accel_threshold)

    min_gap = max(5, int(effective_fps * 0.8))
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

        # Skip weak signals that slipped through
        if jerk_val < min_jerk_threshold and accel_val < min_accel_threshold:
            continue

        severity = "high" if jerk_val > decel_threshold * 2.0 or accel_val > accel_threshold * 2.0 else (
            "medium" if jerk_val > decel_threshold * 1.3 or accel_val > accel_threshold * 1.3 else "low"
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
    body_height = np.abs(shoulder_y - hip_y)

    dt = 1.0 / effective_fps
    shoulder_vel = np.diff(shoulder_y) / dt
    hip_vel = np.diff(hip_y) / dt
    combined_fall_rate = (shoulder_vel + hip_vel) / 2.0
    height_change = np.diff(body_height) / dt

    # Much stricter threshold — only flag genuine collapses
    fall_threshold = float(np.mean(np.abs(combined_fall_rate)) + 5.0 * np.std(np.abs(combined_fall_rate)))
    fall_threshold = max(fall_threshold, 0.8)  # high minimum — must be a real fall

    collapse_events = []
    min_gap = max(3, int(effective_fps * 1.0))

    for i in range(len(combined_fall_rate)):
        is_falling = combined_fall_rate[i] > fall_threshold
        is_compressing = i < len(height_change) and height_change[i] < -fall_threshold * 0.3

        if not is_falling:
            continue

        if collapse_events and (i - collapse_events[-1]["frame_seq_idx"]) < min_gap:
            continue

        # Must confirm player stays down for it to count
        look_ahead = min(i + int(effective_fps * 1.5), len(shoulder_y))
        stayed_down = False
        if look_ahead > i + 3:
            post_shoulder = np.mean(shoulder_y[i+1:look_ahead])
            pre_shoulder = np.mean(shoulder_y[max(0, i-5):i])
            if post_shoulder > pre_shoulder + 0.04:  # stricter — must clearly stay lower
                stayed_down = True

        if not stayed_down:
            continue  # skip if player didn't actually stay down

        severity = "critical" if is_compressing else "high"

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
    if len(keypoints_sequence) < 3:
        return []

    events = []
    prev_lk = None
    prev_rk = None
    min_gap = max(3, int(effective_fps * 0.5))

    for i, kp in enumerate(keypoints_sequence):
        lk = _angle_between(kp[LEFT_HIP], kp[LEFT_KNEE], kp[LEFT_ANKLE])
        rk = _angle_between(kp[RIGHT_HIP], kp[RIGHT_KNEE], kp[RIGHT_ANKLE])

        flags = []

        # Only flag truly dangerous angles
        if lk > 178 or rk > 178:
            flags.append("near_hyperextension")

        if lk < 45 or rk < 45:
            flags.append("severe_flexion")

        # Only flag very rapid angle changes (not normal running)
        if prev_lk is not None:
            lk_delta = abs(lk - prev_lk)
            rk_delta = abs(rk - prev_rk)
            max_delta = max(lk_delta, rk_delta)

            if max_delta > 60:
                flags.append("rapid_angle_change")

        if flags:
            if not events or (i - events[-1]["frame_seq_idx"]) >= min_gap:
                severity = "critical" if "severe_flexion" in flags or ("near_hyperextension" in flags and "rapid_angle_change" in flags) else \
                           "high" if "rapid_angle_change" in flags else "moderate"

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
    if not contact_events or len(keypoints_sequence) < 5:
        return []

    coms = compute_center_of_mass(keypoints_sequence)
    dt = 1.0 / effective_fps
    speeds = np.linalg.norm(np.diff(coms, axis=0), axis=1) / dt if len(coms) > 1 else np.array([])

    if len(speeds) == 0:
        return []

    baseline_speed = float(np.median(speeds))
    # Only flag if player is truly motionless — 10% of median or absolute min
    stillness_threshold = max(baseline_speed * 0.10, 0.005)

    stillness_events = []

    for ce in contact_events:
        if ce.get("severity") != "high":
            continue  # only check after HIGH severity contacts

        impact_idx = ce["frame_seq_idx"]
        start = impact_idx + max(1, int(effective_fps * 0.5))
        end = min(impact_idx + int(effective_fps * 3.0), len(speeds))

        if start >= end or end - start < 5:
            continue

        post_speeds = speeds[start:end]
        avg_post_speed = float(np.mean(post_speeds))
        still_frames = int(np.sum(post_speeds < stillness_threshold))
        still_ratio = still_frames / len(post_speeds)

        # Must be almost completely still for extended period
        if still_ratio > 0.7 and avg_post_speed < stillness_threshold * 2:
            severity = "critical" if still_ratio > 0.9 else "high"

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
    collapses = detect_body_collapse(keypoints_sequence, effective_fps)
    hyperextensions = detect_hyperextension(keypoints_sequence, effective_fps)
    stillness = detect_post_impact_stillness(keypoints_sequence, effective_fps, contact_events)

    # Only keep moderate+ hyperextensions (filter out noise)
    hyperextensions = [e for e in hyperextensions if e.get("severity") in ("high", "critical")]

    all_indicators = collapses + hyperextensions + stillness
    all_indicators.sort(key=lambda x: x["timestamp"])

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
