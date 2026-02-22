import os
import json
import sys
from pose_model import PoseEstimator
from biomechanics import extract_biomechanics
from event_detector import detect_jumps, estimate_velocity, detect_contacts, compute_ankle_ground_proximity
from vision_risk_engine import compute_vision_risk


def _analyze(pose_data, video_path):
    """Shared analysis logic: biomechanics + events + risk."""
    keypoints = pose_data["keypoints"]
    effective_fps = pose_data["effective_fps"]
    video_duration = pose_data["total_frames"] / pose_data["fps"] if pose_data["fps"] > 0 else 0

    print(f"[INFO] Extracted {len(keypoints)} frames with pose landmarks "
          f"(effective FPS: {effective_fps:.1f}, duration: {video_duration:.1f}s)")

    if len(keypoints) < 5:
        return {
            "success": False,
            "error": f"Only detected pose in {len(keypoints)} frames (need at least 5). "
                     "Try: (1) a longer clip, (2) frame_skip=1, or (3) a clip where the "
                     "player's full body is more visible and closer to the camera.",
            "frames_detected": len(keypoints),
        }

    print(f"[INFO] Computing biomechanics features...")
    features = extract_biomechanics(keypoints, effective_fps)

    print(f"[INFO] Detecting jumps...")
    jump_count, jump_events = detect_jumps(keypoints, effective_fps)
    print(f"[INFO] Detected {jump_count} jumps")

    print(f"[INFO] Estimating velocity...")
    velocities, velocity_stats, velocity_timeline = estimate_velocity(keypoints, effective_fps)

    print(f"[INFO] Detecting contacts...")
    contact_count, contact_events = detect_contacts(keypoints, effective_fps)
    print(f"[INFO] Detected {contact_count} contact events")

    ground_contact = compute_ankle_ground_proximity(keypoints, effective_fps)

    print(f"[INFO] Computing injury risk assessment...")
    risk = compute_vision_risk(
        features=features,
        jump_data={"jump_count": jump_count, "jump_events": jump_events},
        velocity_data={"velocity_stats": velocity_stats, "velocity_timeline": velocity_timeline},
        contact_data={"contact_count": contact_count, "contact_events": contact_events},
    )

    return {
        "success": True,
        "video_info": {
            "path": os.path.basename(video_path),
            "fps": round(pose_data["fps"], 2),
            "duration_seconds": round(video_duration, 2),
            "frames_analyzed": len(keypoints),
            "total_frames": pose_data["total_frames"],
        },
        "risk": risk,
        "events": {
            "jumps": {"count": jump_count, "events": jump_events},
            "contacts": {"count": contact_count, "events": contact_events},
        },
        "graphs": {
            "biomechanics_timeline": features.pop("timeline", []),
            "velocity_timeline": velocity_timeline,
            "ground_contact_timeline": ground_contact,
        },
        "stats": {
            "biomechanics": features,
            "velocity": velocity_stats,
        },
    }


def run_vision_pipeline(video_path, frame_skip=3, resize_width=640):
    """Single-person pipeline (works when only one person is in frame)."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    print(f"[INFO] Initializing pose estimator...")
    pose = PoseEstimator()

    print(f"[INFO] Extracting keypoints from video: {video_path}")
    pose_data = pose.extract_keypoints(
        video_path, frame_skip=frame_skip, resize_width=resize_width
    )

    return _analyze(pose_data, video_path)


def run_player_pipeline(video_path, player_name="target player",
                         frame_skip=3, resize_width=640, select_frame=0):
    """Interactive multi-player pipeline (opens OpenCV window for player selection)."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    from player_tracker import PlayerTracker

    print(f"[INFO] Initializing player tracker...")
    tracker = PlayerTracker(model_size="yolov8n.pt")

    print(f"[INFO] Please select {player_name} in the popup window...")
    tracker.select_player_interactive(video_path, frame_idx=select_frame)

    return _run_tracking_pipeline(tracker, video_path, player_name, frame_skip, resize_width)


def run_player_pipeline_headless(video_path, player_name="target player",
                                  frame_skip=3, resize_width=640, track_id=None):
    """
    Headless multi-player pipeline (no GUI).
    If track_id is None, picks the largest detected person.
    Used by the API server.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    from player_tracker import PlayerTracker
    import cv2

    print(f"[INFO] Initializing player tracker (headless)...")
    tracker = PlayerTracker(model_size="yolov8n.pt")

    if track_id is not None:
        tracker.set_target_track_id(track_id)
        print(f"[INFO] Using provided track ID: {track_id}")
    else:
        # Auto-select the largest person in frame 30
        cap = cv2.VideoCapture(video_path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        seek_frame = min(30, max(0, total - 1))
        cap.set(cv2.CAP_PROP_POS_FRAMES, seek_frame)
        ret, frame = cap.read()
        cap.release()

        if not ret:
            return {"success": False, "error": "Cannot read video"}

        results = tracker.model.track(frame, persist=True, classes=[0], verbose=False)
        if results[0].boxes is None or results[0].boxes.id is None or len(results[0].boxes) == 0:
            return {"success": False, "error": "No players detected in video"}

        boxes = results[0].boxes.xyxy.cpu().numpy()
        ids = results[0].boxes.id.cpu().numpy().astype(int)
        areas = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
        largest_idx = areas.argmax()
        auto_id = int(ids[largest_idx])
        tracker.set_target_track_id(auto_id)
        print(f"[INFO] Auto-selected largest player with track ID: {auto_id}")

    return _run_tracking_pipeline(tracker, video_path, player_name, frame_skip, resize_width)


def _run_tracking_pipeline(tracker, video_path, player_name, frame_skip, resize_width):
    """Shared logic for both interactive and headless player pipelines."""
    print(f"[INFO] Tracking {player_name} across video...")
    track_data = tracker.extract_player_crops(
        video_path, frame_skip=frame_skip, resize_width=resize_width
    )

    crops = track_data["crops"]
    print(f"[INFO] Got {len(crops)} frames of {player_name}")

    if len(crops) < 5:
        return {
            "success": False,
            "error": f"Only tracked {player_name} in {len(crops)} frames. "
                     "Try a longer clip or one where the player is more visible.",
            "frames_detected": len(crops),
        }

    print(f"[INFO] Running pose estimation on {player_name}...")
    pose = PoseEstimator()
    pose_data = pose.extract_keypoints_from_crops(
        crops=crops,
        bboxes=track_data["bboxes"],
        frame_indices=track_data["frame_indices"],
        fps=track_data["fps"],
        effective_fps=track_data["effective_fps"],
        original_frame_size=track_data["frame_size"],
    )

    result = _analyze(pose_data, video_path)

    if result.get("success"):
        result["player"] = {
            "name": player_name,
            "track_id": tracker.target_track_id,
            "frames_tracked": len(crops),
        }

    return result


def _print_results(result):
    print("\n" + "=" * 60)
    print("VISION PIPELINE RESULTS")
    print("=" * 60)

    if not result.get("success"):
        print(f"[ERROR] {result.get('error')}")
        return

    if "player" in result:
        p = result["player"]
        print(f"\nPlayer: {p['name']} (track ID: {p['track_id']}, {p['frames_tracked']} frames)")

    risk = result["risk"]
    print(f"\nOverall Risk Score: {risk['overall_risk_score']}/100 ({risk['risk_category'].upper()})")
    print(f"\nRisk Factors:")
    for f in risk["risk_factors"]:
        print(f"  {f['label']}: {f['score']}/100 (weight: {f['weight']}%) — {f['details']}")

    events = result["events"]
    print(f"\nEvents Detected:")
    print(f"  Jumps: {events['jumps']['count']}")
    print(f"  Contacts: {events['contacts']['count']}")

    stats = result["stats"]
    print(f"\nVelocity: max={stats['velocity']['max_velocity']}, "
          f"mean={stats['velocity']['mean_velocity']}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:")
        print('  python vision_pipeline.py single <video_path>')
        print('  python vision_pipeline.py player <video_path> ["Player Name"]')
        print()
        print("Examples:")
        print('  python vision_pipeline.py single test_video.mp4')
        print('  python vision_pipeline.py player nba_clip.mp4 "Austin Reaves #15"')
        sys.exit(1)

    mode = sys.argv[1]
    video_path = sys.argv[2]

    if mode == "single":
        result = run_vision_pipeline(video_path)
    elif mode == "player":
        player_name = sys.argv[3] if len(sys.argv) > 3 else "Target Player"
        result = run_player_pipeline(video_path, player_name=player_name)
    else:
        print(f"Unknown mode: {mode}. Use 'single' or 'player'.")
        sys.exit(1)

    _print_results(result)

    output_path = "vision_result.json"
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\n[INFO] Full results written to {output_path}")