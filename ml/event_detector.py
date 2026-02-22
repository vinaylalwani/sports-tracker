"""
Detects athletic events from pose keypoint sequences:
  - Jumps (vertical displacement of hips)
  - Velocity (center-of-mass displacement per frame)
  - Contact approximation (sudden deceleration / jerk)
"""

import numpy as np
from scipy.signal import find_peaks

LEFT_HIP, RIGHT_HIP = 23, 24
LEFT_ANKLE, RIGHT_ANKLE = 27, 28


def _midpoint(kp, idx_a, idx_b):
    return (kp[idx_a][:2] + kp[idx_b][:2]) / 2.0


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
