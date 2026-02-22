"""
REST API server for the vision pipeline.
Accepts video uploads, runs analysis, returns structured JSON.

Usage:
  cd /Users/williamchen/Documents/GitHub/sports-tracker/ml
  python api_server.py

Then POST a video to http://localhost:5050/api/analyze
"""

import os
import sys
import json
import uuid
import tempfile
import traceback

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "sports_tracker_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "sports-tracker-vision"})


@app.route("/api/analyze", methods=["POST"])
def analyze_video():
    """
    Accepts multipart form upload with:
      - video: the video file
      - mode: "single" or "player" (default: "single")
      - player_name: e.g. "Austin Reaves #15" (for player mode)
      - frame_skip: int (default: 2)
      - track_id: int (optional, skip interactive selection in player mode)
    """
    if "video" not in request.files:
        return jsonify({"success": False, "error": "No video file provided"}), 400

    video_file = request.files["video"]
    if video_file.filename == "":
        return jsonify({"success": False, "error": "Empty filename"}), 400

    mode = request.form.get("mode", "single")
    player_name = request.form.get("player_name", "Target Player")
    frame_skip = int(request.form.get("frame_skip", "2"))
    track_id = request.form.get("track_id")

    # Save uploaded file
    ext = os.path.splitext(video_file.filename)[1] or ".mp4"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    try:
        video_file.save(filepath)
        print(f"[API] Saved upload to {filepath} ({os.path.getsize(filepath)} bytes)")

        if mode == "player":
            result = _run_player_mode(filepath, player_name, frame_skip, track_id)
        else:
            result = _run_single_mode(filepath, frame_skip)

        return jsonify(result)

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
        }), 500

    finally:
        # Clean up uploaded file
        if os.path.exists(filepath):
            os.remove(filepath)


@app.route("/api/analyze/multi", methods=["POST"])
def analyze_multi_players():
    """
    Analyze multiple players from the same video.
    Expects:
      - video: the video file
      - players: JSON string like [{"track_id": 1, "name": "Austin Reaves #15"}, ...]
      - frame_skip: int (default: 2)
    Returns:
      - success: bool
      - results: list of per-player AnalysisResult dicts
    """
    if "video" not in request.files:
        return jsonify({"success": False, "error": "No video file provided"}), 400

    video_file = request.files["video"]
    players_json = request.form.get("players", "[]")
    frame_skip = int(request.form.get("frame_skip", "2"))

    try:
        players = json.loads(players_json)
    except json.JSONDecodeError:
        return jsonify({"success": False, "error": "Invalid players JSON"}), 400

    if not players or not isinstance(players, list):
        return jsonify({"success": False, "error": "No players specified"}), 400

    ext = os.path.splitext(video_file.filename)[1] or ".mp4"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    try:
        video_file.save(filepath)
        print(f"[API] Multi-player analysis: {len(players)} players, saved to {filepath}")

        from vision_pipeline import run_player_pipeline_headless

        results = []
        for p in players:
            tid = p.get("track_id")
            name = p.get("name", f"Player {tid}")
            print(f"\n[API] === Analyzing {name} (track_id={tid}) ===")
            try:
                result = run_player_pipeline_headless(
                    filepath,
                    player_name=name,
                    frame_skip=frame_skip,
                    track_id=int(tid) if tid is not None else None,
                )
                results.append(result)
            except Exception as e:
                traceback.print_exc()
                results.append({
                    "success": False,
                    "error": str(e),
                    "player": {"name": name, "track_id": tid, "frames_tracked": 0},
                })

        return jsonify({"success": True, "results": results})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


@app.route("/api/analyze/detect-players", methods=["POST"])
def detect_players():
    """
    Accepts a video and returns bounding boxes of detected players
    so the frontend can let the user pick one without OpenCV GUI.
    
    Returns list of {track_id, bbox: {x1,y1,x2,y2}, center: {x,y}} 
    and a base64 frame image.
    """
    import base64
    import cv2

    if "video" not in request.files:
        return jsonify({"success": False, "error": "No video file provided"}), 400

    video_file = request.files["video"]
    frame_idx = int(request.form.get("frame_idx", "30"))

    ext = os.path.splitext(video_file.filename)[1] or ".mp4"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    try:
        video_file.save(filepath)

        from player_tracker import PlayerTracker
        tracker = PlayerTracker(model_size="yolov8n.pt")

        cap = cv2.VideoCapture(filepath)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        actual_frame = min(frame_idx, max(0, total_frames - 1))
        cap.set(cv2.CAP_PROP_POS_FRAMES, actual_frame)
        ret, frame = cap.read()
        cap.release()

        if not ret:
            return jsonify({"success": False, "error": "Cannot read video frame"}), 400

        results = tracker.model.track(frame, persist=True, classes=[0], verbose=False)
        players = []

        if results[0].boxes is not None and results[0].boxes.id is not None:
            for box, tid in zip(results[0].boxes.xyxy.cpu().numpy(),
                                results[0].boxes.id.cpu().numpy().astype(int)):
                x1, y1, x2, y2 = box.astype(int).tolist()
                players.append({
                    "track_id": int(tid),
                    "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    "center": {"x": (x1 + x2) // 2, "y": (y1 + y2) // 2},
                })

        # Encode frame as base64 JPEG for frontend display
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        frame_b64 = base64.b64encode(buffer).decode("utf-8")

        h, w = frame.shape[:2]

        return jsonify({
            "success": True,
            "players": players,
            "frame_image": f"data:image/jpeg;base64,{frame_b64}",
            "frame_size": {"width": w, "height": h},
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if os.path.exists(filepath):
            os.remove(filepath)


def _run_single_mode(filepath, frame_skip):
    from vision_pipeline import run_vision_pipeline
    return run_vision_pipeline(filepath, frame_skip=frame_skip)


def _run_player_mode(filepath, player_name, frame_skip, track_id):
    from vision_pipeline import run_player_pipeline_headless
    tid = int(track_id) if track_id is not None else None
    return run_player_pipeline_headless(
        filepath,
        player_name=player_name,
        frame_skip=frame_skip,
        track_id=tid,
    )


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5050
    print(f"[API] Starting vision API server on http://localhost:{port}")
    print(f"[API] Upload dir: {UPLOAD_DIR}")
    app.run(host="0.0.0.0", port=port, debug=True)
