"""
Quick test script for the vision pipeline.

HOW TO TEST (Austin Reaves #15 from an NBA clip):
==================================================

1. Install dependencies (run once):

   pip install opencv-python mediapipe numpy scipy ultralytics

2. Place your video file in the ml/ folder, or note its full path.

3. Run this script:

   python test_pipeline.py /path/to/your/nba_clip.mp4

4. A window will pop up showing detected players with green boxes.
   → Click on Austin Reaves (#15)
   → Press any key to confirm

5. The pipeline will:
   - Track Reaves across all frames
   - Run pose estimation on his cropped body
   - Compute biomechanics (knee angles, hip angles, trunk lean)
   - Detect jumps, estimate velocity, approximate contacts
   - Score injury risk (0-100)

6. Results print to terminal and save to vision_result.json

NOTES:
  - If the video is short (<2 seconds), use frame_skip=1
  - If Reaves is far away / small, the pose estimation may struggle
  - For single-person videos, use: python vision_pipeline.py single video.mp4
"""

import sys
import os
import json


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nUsage: python test_pipeline.py <video_path> [frame_skip]")
        print("\nExample:")
        print('  python test_pipeline.py nba_lakers_clip.mp4')
        print('  python test_pipeline.py nba_lakers_clip.mp4 2')
        sys.exit(1)

    video_path = sys.argv[1]
    frame_skip = int(sys.argv[2]) if len(sys.argv) > 2 else 3

    if not os.path.exists(video_path):
        print(f"[ERROR] Video file not found: {video_path}")
        print(f"  Current directory: {os.getcwd()}")
        print(f"  Files here: {os.listdir('.')}")
        sys.exit(1)

    print("=" * 60)
    print("SPORTS TRACKER — Vision Pipeline Test")
    print("=" * 60)
    print(f"Video: {video_path}")
    print(f"Frame skip: {frame_skip}")
    print(f"Target: Austin Reaves #15")
    print()

    try:
        from vision_pipeline import run_player_pipeline

        result = run_player_pipeline(
            video_path=video_path,
            player_name="Austin Reaves #15",
            frame_skip=frame_skip,
            select_frame=30,  # show frame 30 for selection (skip intros/logos)
        )
    except ImportError as e:
        print(f"[ERROR] Missing dependency: {e}")
        print("Run: pip install opencv-python mediapipe numpy scipy ultralytics")
        sys.exit(1)

    # Print results
    print("\n" + "=" * 60)
    if not result.get("success"):
        print(f"[FAILED] {result.get('error')}")
    else:
        risk = result["risk"]
        player = result.get("player", {})

        print(f"Player: {player.get('name', 'Unknown')}")
        print(f"Frames tracked: {player.get('frames_tracked', 0)}")
        print(f"\n{'─' * 40}")
        print(f"OVERALL RISK: {risk['overall_risk_score']}/100 ({risk['risk_category'].upper()})")
        print(f"{'─' * 40}")

        for f in risk["risk_factors"]:
            bar = "█" * int(f["score"] / 5) + "░" * (20 - int(f["score"] / 5))
            print(f"  {f['label']:.<30} {f['score']:>5.1f} {bar}")

        events = result["events"]
        print(f"\n  Jumps detected: {events['jumps']['count']}")
        for j in events["jumps"]["events"][:5]:
            print(f"    → t={j['timestamp']}s, height={j['jump_height_norm']:.3f}")

        print(f"  Contacts detected: {events['contacts']['count']}")
        for c in events["contacts"]["events"][:5]:
            print(f"    → t={c['timestamp']}s, severity={c['severity']}")

    # Save JSON
    output_path = "vision_result.json"
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\n[INFO] Full JSON results → {os.path.abspath(output_path)}")
    print("[INFO] Open vision_result.json in VS Code to inspect all graph data.")


if __name__ == "__main__":
    main()
