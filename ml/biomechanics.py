# biomechanics.py

import numpy as np


def calculate_angle(a, b, c):
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    ba = a - b
    bc = c - b

    cosine_angle = np.dot(ba, bc) / (
        np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-6
    )

    angle = np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))
    return angle


def extract_biomechanics(keypoints_sequence):
    knee_angles = []
    hip_angles = []

    for kp in keypoints_sequence:
        # MediaPipe indices
        LEFT_HIP = 23
        LEFT_KNEE = 25
        LEFT_ANKLE = 27

        hip = kp[LEFT_HIP]
        knee = kp[LEFT_KNEE]
        ankle = kp[LEFT_ANKLE]

        knee_angle = calculate_angle(hip, knee, ankle)
        knee_angles.append(knee_angle)

        # hip flexion example
        LEFT_SHOULDER = 11
        shoulder = kp[LEFT_SHOULDER]
        hip_angle = calculate_angle(shoulder, hip, knee)
        hip_angles.append(hip_angle)

    knee_angles = np.array(knee_angles)
    hip_angles = np.array(hip_angles)

    features = {
        "avg_knee_angle": float(np.mean(knee_angles)),
        "knee_variability": float(np.std(knee_angles)),
        "avg_hip_angle": float(np.mean(hip_angles)),
        "hip_variability": float(np.std(hip_angles)),
        "movement_variability": float(np.var(knee_angles)),
        "sample_size": len(knee_angles),
    }

    return features