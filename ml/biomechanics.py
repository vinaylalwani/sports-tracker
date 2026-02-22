# biomechanics.py

import numpy as np


def calculate_angle(a, b, c):
    a = np.array(a[:2])  # use x, y only
    b = np.array(b[:2])
    c = np.array(c[:2])

    ba = a - b
    bc = c - b

    cosine_angle = np.dot(ba, bc) / (
        np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6
    )
    angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
    return angle


# MediaPipe indices
LEFT_SHOULDER, RIGHT_SHOULDER = 11, 12
LEFT_HIP, RIGHT_HIP = 23, 24
LEFT_KNEE, RIGHT_KNEE = 25, 26
LEFT_ANKLE, RIGHT_ANKLE = 27, 28


def extract_biomechanics(keypoints_sequence, effective_fps=10.0):
    """
    Compute per-frame biomechanics features and aggregate stats.
    Returns dict with summary stats AND time-series for frontend graphs.
    """
    left_knee_angles = []
    right_knee_angles = []
    left_hip_angles = []
    right_hip_angles = []
    trunk_lean_angles = []
    knee_symmetry = []

    per_frame = []

    for i, kp in enumerate(keypoints_sequence):
        # Left leg
        lk_angle = calculate_angle(kp[LEFT_HIP], kp[LEFT_KNEE], kp[LEFT_ANKLE])
        left_knee_angles.append(lk_angle)

        # Right leg
        rk_angle = calculate_angle(kp[RIGHT_HIP], kp[RIGHT_KNEE], kp[RIGHT_ANKLE])
        right_knee_angles.append(rk_angle)

        # Left hip flexion
        lh_angle = calculate_angle(kp[LEFT_SHOULDER], kp[LEFT_HIP], kp[LEFT_KNEE])
        left_hip_angles.append(lh_angle)

        # Right hip flexion
        rh_angle = calculate_angle(kp[RIGHT_SHOULDER], kp[RIGHT_HIP], kp[RIGHT_KNEE])
        right_hip_angles.append(rh_angle)

        # Trunk lean: angle between vertical and shoulder-hip line
        mid_shoulder = (kp[LEFT_SHOULDER][:2] + kp[RIGHT_SHOULDER][:2]) / 2.0
        mid_hip = (kp[LEFT_HIP][:2] + kp[RIGHT_HIP][:2]) / 2.0
        trunk_vec = mid_shoulder - mid_hip
        vertical = np.array([0, -1])  # up in image coords
        cos_trunk = np.dot(trunk_vec, vertical) / (np.linalg.norm(trunk_vec) + 1e-6)
        trunk_angle = np.degrees(np.arccos(np.clip(cos_trunk, -1.0, 1.0)))
        trunk_lean_angles.append(trunk_angle)

        # Knee symmetry (0 = perfect symmetry)
        sym = abs(lk_angle - rk_angle)
        knee_symmetry.append(sym)

        per_frame.append({
            "timestamp": round(float(i / effective_fps), 3),
            "left_knee_angle": round(float(lk_angle), 2),
            "right_knee_angle": round(float(rk_angle), 2),
            "left_hip_angle": round(float(lh_angle), 2),
            "right_hip_angle": round(float(rh_angle), 2),
            "trunk_lean": round(float(trunk_angle), 2),
            "knee_symmetry_diff": round(float(sym), 2),
        })

    lka = np.array(left_knee_angles)
    rka = np.array(right_knee_angles)
    all_knee = np.concatenate([lka, rka])

    lha = np.array(left_hip_angles)
    rha = np.array(right_hip_angles)
    all_hip = np.concatenate([lha, rha])

    trunk = np.array(trunk_lean_angles)
    sym_arr = np.array(knee_symmetry)

    features = {
        # Summary stats
        "avg_knee_angle": round(float(np.mean(all_knee)), 2),
        "min_knee_angle": round(float(np.min(all_knee)), 2),
        "knee_variability": round(float(np.std(all_knee)), 2),
        "avg_hip_angle": round(float(np.mean(all_hip)), 2),
        "min_hip_angle": round(float(np.min(all_hip)), 2),
        "hip_variability": round(float(np.std(all_hip)), 2),
        "avg_trunk_lean": round(float(np.mean(trunk)), 2),
        "max_trunk_lean": round(float(np.max(trunk)), 2),
        "avg_knee_symmetry_diff": round(float(np.mean(sym_arr)), 2),
        "max_knee_symmetry_diff": round(float(np.max(sym_arr)), 2),
        "movement_variability": round(float(np.var(all_knee)), 2),
        "sample_size": len(keypoints_sequence),
        # Time-series for graphs
        "timeline": per_frame,
    }

    return features