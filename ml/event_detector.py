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


def detect_jumps(keypoints_sequence, effective_fps, min_jump_height=0.025, min_prominence=0.012):
    if len(keypoints_sequence) < 5:
        return 0, []

    hip_y = np.array([_midpoint(kp, LEFT_HIP, RIGHT_HIP)[1] for kp in keypoints_sequence])

    kernel_size = max(5, int(effective_fps * 0.15))
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel = np.ones(kernel_size) / kernel_size
    hip_y_smooth = np.convolve(hip_y, kernel, mode="same")

    inverted = -hip_y_smooth
    min_distance = max(5, int(effective_fps * 0.35))
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

    kernel_size = min(5, max(3, int(effective_fps * 0.15)))
    if kernel_size % 2 == 0:
        kernel_size += 1
    kernel = np.ones(kernel_size) / kernel_size
    coms_smooth = np.column_stack([
        np.convolve(coms[:, 0], kernel, mode="same"),
        np.convolve(coms[:, 1], kernel, mode="same"),
    ])

    dt = 1.0 / effective_fps
    speeds = np.linalg.norm(np.diff(coms_smooth, axis=0), axis=1) / dt
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

    # Lower thresholds to detect more contacts
    if decel_threshold is None:
        decel_threshold = float(np.mean(abs_jerk) + 2.5 * np.std(abs_jerk))  # reduced from 4.0
    accel_threshold = float(np.mean(abs_accel) + 2.5 * np.std(abs_accel))  # reduced from 4.0

    # Lower minimum absolute thresholds
    min_jerk_threshold = 8.0  # reduced from 15.0
    min_accel_threshold = 3.0  # reduced from 5.0
    decel_threshold = max(decel_threshold, min_jerk_threshold)
    accel_threshold = max(accel_threshold, min_accel_threshold)

    min_gap = max(4, int(effective_fps * 0.5))  # reduced from 0.8
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

        # Lower skip threshold
        if jerk_val < min_jerk_threshold * 0.5 and accel_val < min_accel_threshold * 0.5:
            continue

        severity = "high" if jerk_val > decel_threshold * 1.8 or accel_val > accel_threshold * 1.8 else (
            "medium" if jerk_val > decel_threshold * 1.2 or accel_val > accel_threshold * 1.2 else "low"
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
# SERIOUS INJURY INDICATORS — very strict to avoid false positives
# ============================================================

def detect_body_collapse(keypoints_sequence, effective_fps):
    """
    Detect genuine body collapse (player falls to the ground and stays down).
    
    Requirements for a collapse detection:
    1. Shoulder Y must drop by a large absolute amount (>15% of standing body height)
    2. The drop must happen quickly (within ~0.5s)
    3. Player must stay at the lower position for at least 1.5 seconds
    4. The final position must be significantly below the standing baseline
    
    This avoids false positives from:
    - Normal bending/crouching
    - Landing from jumps
    - Defensive stances
    - Pose estimation jitter
    """
    if len(keypoints_sequence) < int(effective_fps * 2.5):
        # Need at least 2.5 seconds of footage to detect collapse + recovery check
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

    # Heavy smoothing to eliminate pose jitter (window = ~0.4s)
    smooth_window = max(7, int(effective_fps * 0.4))
    if smooth_window % 2 == 0:
        smooth_window += 1
    kernel = np.ones(smooth_window) / smooth_window
    shoulder_y = np.convolve(shoulder_y, kernel, mode="same")
    hip_y = np.convolve(hip_y, kernel, mode="same")

    # Compute standing body height (shoulder-to-hip distance) as reference
    body_height = np.abs(shoulder_y - hip_y)
    # Use the 25th percentile as "standing" height (robust to frames where player is down)
    standing_height = np.percentile(body_height, 25)
    if standing_height < 0.02:
        return []  # landmarks too close together, unreliable

    # Standing shoulder baseline: use the 25th percentile of shoulder Y
    # (lower Y = higher in frame for normalized coords; but in image coords, higher Y = lower)
    # In normalized coords (0=top, 1=bottom), "standing" = lower shoulder_y value
    standing_shoulder = np.percentile(shoulder_y, 25)

    # Minimum drop required: 15% of standing body height in normalized coords
    min_drop = standing_height * 0.15
    # Absolute minimum: must drop at least 0.06 in normalized coords
    min_drop = max(min_drop, 0.06)

    collapse_events = []
    # Window for detecting rapid drop: ~0.5 seconds
    drop_window = max(3, int(effective_fps * 0.5))
    # Window for confirming player stays down: ~1.5 seconds
    stay_down_window = max(5, int(effective_fps * 1.5))
    # Minimum gap between collapse events
    min_gap = max(5, int(effective_fps * 3.0))

    i = drop_window
    while i < len(shoulder_y) - stay_down_window:
        # Check if shoulder dropped significantly in the last drop_window frames
        pre_shoulder = np.min(shoulder_y[max(0, i - drop_window * 2):i - drop_window + 1])
        current_shoulder = shoulder_y[i]
        drop = current_shoulder - pre_shoulder  # positive = moved down in image

        if drop < min_drop:
            i += 1
            continue

        # Check if this is below the standing baseline
        if current_shoulder < standing_shoulder + min_drop * 0.5:
            i += 1
            continue

        # Confirm player stays down for stay_down_window
        post_segment = shoulder_y[i:i + stay_down_window]
        # Player must remain at or below the dropped position (within tolerance)
        tolerance = standing_height * 0.08
        stayed_down_count = np.sum(post_segment >= (current_shoulder - tolerance))
        stayed_down_ratio = stayed_down_count / len(post_segment)

        if stayed_down_ratio < 0.75:
            i += 1
            continue

        # Also check that body height compressed (shoulder closer to hip)
        post_body_height = np.mean(body_height[i:i + stay_down_window])
        height_ratio = post_body_height / (standing_height + 1e-6)
        if height_ratio > 0.85:
            # Body height didn't compress enough — likely just moved lower in frame, not collapsed
            i += 1
            continue

        # Genuine collapse detected
        severity = "critical" if (drop > min_drop * 2 and stayed_down_ratio > 0.9) else "high"

        collapse_events.append({
            "frame_seq_idx": int(i),
            "timestamp": round(float(i / effective_fps), 3),
            "fall_rate": round(float(drop / (drop_window / effective_fps)), 4),
            "drop_amount": round(float(drop), 4),
            "stayed_down": True,
            "stayed_down_ratio": round(float(stayed_down_ratio), 2),
            "body_height_ratio": round(float(height_ratio), 2),
            "severity": severity,
            "type": "collapse",
        })

        # Skip ahead past this event
        i += stay_down_window + min_gap
        continue

    return collapse_events


def detect_hyperextension(keypoints_sequence, effective_fps):
    """
    Detect dangerous knee angles. Very strict to avoid false positives.
    Only flags truly extreme angles that are biomechanically dangerous.
    """
    if len(keypoints_sequence) < 3:
        return []

    events = []
    prev_lk = None
    prev_rk = None
    min_gap = max(3, int(effective_fps * 1.0))

    # Collect all angles first for statistical baseline
    all_lk = []
    all_rk = []
    for kp in keypoints_sequence:
        lk = _angle_between(kp[LEFT_HIP], kp[LEFT_KNEE], kp[LEFT_ANKLE])
        rk = _angle_between(kp[RIGHT_HIP], kp[RIGHT_KNEE], kp[RIGHT_ANKLE])
        all_lk.append(lk)
        all_rk.append(rk)

    all_lk = np.array(all_lk)
    all_rk = np.array(all_rk)

    # Smooth angles
    sw = min(5, max(3, len(all_lk) // 10))
    if sw >= 2:
        k = np.ones(sw) / sw
        all_lk = np.convolve(all_lk, k, mode="same")
        all_rk = np.convolve(all_rk, k, mode="same")

    for i in range(len(keypoints_sequence)):
        lk = all_lk[i]
        rk = all_rk[i]

        flags = []

        # Only flag truly dangerous angles (near full extension beyond normal)
        if lk > 182 or rk > 182:
            flags.append("near_hyperextension")

        # Severe flexion (knee bent beyond normal range)
        if lk < 35 or rk < 35:
            flags.append("severe_flexion")

        # Rapid angle change — only flag extreme sudden changes
        if prev_lk is not None:
            lk_delta = abs(lk - prev_lk)
            rk_delta = abs(rk - prev_rk)
            max_delta = max(lk_delta, rk_delta)

            # Very strict: must be > 80 degrees per frame (after smoothing!)
            if max_delta > 80:
                flags.append("rapid_angle_change")

        if flags:
            if not events or (i - events[-1]["frame_seq_idx"]) >= min_gap:
                severity = "critical" if ("severe_flexion" in flags and "rapid_angle_change" in flags) else \
                           "high" if "near_hyperextension" in flags else "moderate"

                events.append({
                    "frame_seq_idx": int(i),
                    "timestamp": round(float(i / effective_fps), 3),
                    "left_knee_angle": round(float(lk), 1),
                    "right_knee_angle": round(float(rk), 1),
                    "angle_delta": round(float(max(abs(lk - (prev_lk if prev_lk is not None else lk)),
                                                    abs(rk - (prev_rk if prev_rk is not None else rk)))), 1),
                    "flags": flags,
                    "severity": severity,
                    "type": "hyperextension",
                })

        prev_lk = lk
        prev_rk = rk

    return events


def detect_post_impact_stillness(keypoints_sequence, effective_fps, contact_events):
    """
    Detect if a player becomes motionless after a high-severity contact.
    Very strict — only flags genuine post-impact stillness.
    """
    if not contact_events or len(keypoints_sequence) < 5:
        return []

    coms = compute_center_of_mass(keypoints_sequence)
    dt = 1.0 / effective_fps
    speeds = np.linalg.norm(np.diff(coms, axis=0), axis=1) / dt if len(coms) > 1 else np.array([])

    if len(speeds) == 0:
        return []

    # Use a robust baseline: 75th percentile of speed (player is usually moving)
    baseline_speed = float(np.percentile(speeds, 75))
    if baseline_speed < 0.01:
        return []  # player barely moving throughout — can't detect stillness meaningfully

    # Player must be nearly motionless: 5% of their normal movement speed
    stillness_threshold = max(baseline_speed * 0.05, 0.003)

    stillness_events = []

    for ce in contact_events:
        if ce.get("severity") != "high":
            continue

        impact_idx = ce["frame_seq_idx"]
        # Check 0.5s to 3s after impact
        start = impact_idx + max(1, int(effective_fps * 0.5))
        end = min(impact_idx + int(effective_fps * 3.0), len(speeds))

        if start >= end or end - start < max(5, int(effective_fps * 1.0)):
            continue

        post_speeds = speeds[start:end]
        avg_post_speed = float(np.mean(post_speeds))
        still_frames = int(np.sum(post_speeds < stillness_threshold))
        still_ratio = still_frames / len(post_speeds)

        # Must be almost completely still for the majority of the window
        if still_ratio > 0.80 and avg_post_speed < stillness_threshold * 1.5:
            severity = "critical" if still_ratio > 0.95 else "high"

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
    stillness = detect_post_impact_stillness(keypoints_sequence, effective_fps, contact_events)
    # Hyperextension excluded by default — too many false positives from pose noise

    all_indicators = collapses + stillness
    all_indicators.sort(key=lambda x: x["timestamp"])

    critical_count = sum(1 for e in all_indicators if e.get("severity") == "critical")
    high_count = sum(1 for e in all_indicators if e.get("severity") == "high")

    return {
        "indicators": all_indicators,
        "collapse_count": len(collapses),
        "stillness_count": len(stillness),
        "critical_count": critical_count,
        "high_count": high_count,
        "total_count": len(all_indicators),
        "has_serious_flags": critical_count > 0 or high_count >= 2,
    }
