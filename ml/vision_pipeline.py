import os
from pose_model import PoseEstimator
from biomechanics import extract_biomechanics
from vision_risk_engine import compute_vision_risk


def run_vision_pipeline(video_path, frame_skip=3, resize_width=640):
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    print(f"[INFO] Initializing pose estimator...")
    pose = PoseEstimator()

    print(f"[INFO] Extracting keypoints from video: {video_path}")
    keypoints = pose.extract_keypoints(
        video_path, frame_skip=frame_skip, resize_width=resize_width
    )
    print(f"[INFO] Extracted {len(keypoints)} frames with pose landmarks")

    if len(keypoints) < 10:
        return {"error": "Not enough pose data detected"}

    print(f"[INFO] Computing biomechanics features...")
    features = extract_biomechanics(keypoints)

    print(f"[INFO] Computing vision risk score...")
    risk = compute_vision_risk(features)

    return {
        "features": features,
        "vision_risk_score": risk,
    }


if __name__ == "__main__":
    test_video = "test_video.mp4"
    result = run_vision_pipeline(test_video)
    print("\n[RESULT]")
    print(result)