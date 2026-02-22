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
            "path": video_path,
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
    """
    Simple single-person pipeline (works when only one person is in frame).
    """
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
    """
    Multi-player pipeline: detects all players, lets you click on the target,
    then tracks and analyzes only that player.

    Args:
        video_path: path to video file
        player_name: name for display (e.g., "Austin Reaves #15")
        frame_skip: process every Nth frame
        resize_width: resize frames for speed
        select_frame: which frame to show for player selection
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video not found: {video_path}")

    from player_tracker import PlayerTracker

    # Step 1: Detect and select player
    print(f"[INFO] Initializing player tracker...")
    tracker = PlayerTracker(model_size="yolov8n.pt")

    print(f"[INFO] Please select {player_name} in the popup window...")
    tracker.select_player_interactive(video_path, frame_idx=select_frame)

    # Step 2: Extract crops of the target player
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
                     "Try: (1) frame_skip=1, (2) a longer clip, or (3) a clip where "
                     "the player is on screen more.",
            "frames_detected": len(crops),
        }

    # Step 3: Run pose estimation on cropped player images
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

    # Step 4: Analyze
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
    # ---------------------------------------------------------------
    # USAGE:
    #
    #   Single person video (e.g., workout clip):
    #     python vision_pipeline.py single path/to/video.mp4
    #
    #   Multi-player video (e.g., NBA game, track Austin Reaves):
    #     python vision_pipeline.py player path/to/video.mp4 "Austin Reaves #15"
    #
    #   A window will pop up — click on the player you want to track,
    #   then press any key to start analysis.
    # ---------------------------------------------------------------

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