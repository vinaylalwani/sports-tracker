"""
Player detection + tracking for multi-player footage (e.g., NBA games).
Uses YOLOv8 for person detection with built-in tracking.
Allows user to select which player to track by clicking on them.
"""

import cv2
import numpy as np

try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False


class PlayerTracker:
    def __init__(self, model_size="yolov8n.pt"):
        """
        Args:
            model_size: YOLOv8 model. 'yolov8n.pt' is fastest for CPU.
        """
        if not HAS_YOLO:
            raise ImportError(
                "ultralytics is required for player tracking.\n"
                "Install with: pip install ultralytics"
            )
        self.model = YOLO(model_size)
        self.target_track_id = None

    def select_player_interactive(self, video_path, frame_idx=0):
        """
        Opens a window showing a frame from the video with detected players.
        User clicks on the target player (e.g., Austin Reaves #15).
        Returns the track_id assigned to that player.
        """
        cap = cv2.VideoCapture(video_path)

        # Seek to requested frame
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            cap.release()
            raise RuntimeError(f"Cannot read frame {frame_idx}")

        # Run detection on this frame
        results = self.model.track(frame, persist=True, classes=[0], verbose=False)
        boxes = []
        if results[0].boxes is not None and results[0].boxes.id is not None:
            for box, track_id in zip(results[0].boxes.xyxy.cpu().numpy(),
                                      results[0].boxes.id.cpu().numpy().astype(int)):
                x1, y1, x2, y2 = box.astype(int)
                boxes.append({"bbox": (x1, y1, x2, y2), "track_id": int(track_id)})

        if not boxes:
            cap.release()
            raise RuntimeError("No players detected in frame. Try a different frame_idx.")

        # Draw boxes with track IDs
        display = frame.copy()
        for b in boxes:
            x1, y1, x2, y2 = b["bbox"]
            cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(display, f"ID:{b['track_id']}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        selected_id = [None]

        def on_click(event, x, y, flags, param):
            if event == cv2.EVENT_LBUTTONDOWN:
                # Find which box was clicked
                for b in boxes:
                    bx1, by1, bx2, by2 = b["bbox"]
                    if bx1 <= x <= bx2 and by1 <= y <= by2:
                        selected_id[0] = b["track_id"]
                        print(f"[INFO] Selected player with track ID: {b['track_id']}")
                        break

        window_name = "Click on the target player (e.g., Austin Reaves #15) then press any key"
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, 1280, 720)
        cv2.setMouseCallback(window_name, on_click)
        cv2.imshow(window_name, display)

        print("\n[ACTION REQUIRED] Click on the target player in the window, then press any key.")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        cap.release()

        if selected_id[0] is None:
            raise RuntimeError("No player selected. Please click inside a bounding box.")

        self.target_track_id = selected_id[0]
        print(f"[INFO] Tracking player with ID: {self.target_track_id}")
        return self.target_track_id

    def set_target_track_id(self, track_id):
        """Manually set the target track ID (skip interactive selection)."""
        self.target_track_id = track_id

    def extract_player_crops(self, video_path, frame_skip=3, resize_width=640, padding=50):
        """
        Run tracking on the full video and extract cropped frames for the target player.
        Padding is added around the bounding box to give MediaPipe enough context.

        Returns:
            dict with:
              - crops: list of cropped BGR frames of the target player
              - bboxes: list of (x1, y1, x2, y2) in original frame coords
              - frame_indices: which video frame each crop came from
              - fps: video FPS
              - effective_fps: FPS after frame skipping
              - total_frames: total frame count
              - frame_size: (width, height) of original video
        """
        if self.target_track_id is None:
            raise RuntimeError("No target player selected. Call select_player_interactive() first.")

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        crops = []
        bboxes = []
        frame_indices = []
        frame_count = 0
        w, h = 0, 0

        # Reset tracker state
        self.model.predictor = None

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            h, w, _ = frame.shape

            if frame_count % frame_skip != 0:
                frame_count += 1
                continue

            # Run tracking on full-res frame (better detection for small players)
            results = self.model.track(frame, persist=True, classes=[0], verbose=False)

            if results[0].boxes is not None and results[0].boxes.id is not None:
                track_ids = results[0].boxes.id.cpu().numpy().astype(int)
                boxes_xyxy = results[0].boxes.xyxy.cpu().numpy()

                match_idx = np.where(track_ids == self.target_track_id)[0]
                idx = None
                if len(match_idx) > 0:
                    idx = match_idx[0]
                elif len(bboxes) > 0:
                    # Re-associate: tracker may have lost ID; use last bbox to find nearest detection
                    def _iou(a, b):
                        x1 = max(a[0], b[0])
                        y1 = max(a[1], b[1])
                        x2 = min(a[2], b[2])
                        y2 = min(a[3], b[3])
                        if x2 <= x1 or y2 <= y1:
                            return 0.0
                        inter = (x2 - x1) * (y2 - y1)
                        aa = (a[2] - a[0]) * (a[3] - a[1])
                        bb = (b[2] - b[0]) * (b[3] - b[1])
                        return inter / (aa + bb - inter) if (aa + bb - inter) > 0 else 0.0
                    last = bboxes[-1]
                    best_iou = 0.0
                    for i, box in enumerate(boxes_xyxy):
                        iou = _iou(last, box.astype(int).tolist())
                        if iou > best_iou and iou >= 0.15:
                            best_iou = iou
                            idx = i
                if idx is not None:
                    x1, y1, x2, y2 = boxes_xyxy[idx].astype(int)

                    box_w = x2 - x1
                    box_h = y2 - y1
                    pad_x = max(padding, int(box_w * 0.4))
                    pad_y = max(padding, int(box_h * 0.3))

                    ox1 = max(0, x1 - pad_x)
                    oy1 = max(0, y1 - pad_y)
                    ox2 = min(w, x2 + pad_x)
                    oy2 = min(h, y2 + pad_y)

                    crop = frame[oy1:oy2, ox1:ox2]
                    if crop.size > 0:
                        crops.append(crop)
                        bboxes.append((ox1, oy1, ox2, oy2))
                        frame_indices.append(frame_count)

            frame_count += 1

        cap.release()

        print(f"[DEBUG] Crop sizes: min={min(c.shape[:2] for c in crops) if crops else (0,0)}, "
              f"max={max(c.shape[:2] for c in crops) if crops else (0,0)}")

        return {
            "crops": crops,
            "bboxes": bboxes,
            "frame_indices": frame_indices,
            "fps": fps,
            "effective_fps": fps / frame_skip,
            "total_frames": frame_count,
            "frame_size": (w, h),
        }

    def get_all_frames_bboxes(self, video_path, frame_skip=2, reference_frame_index=30,
                              reference_selections=None):
        """
        Run tracking on the full video and return per-frame bounding boxes for all players.
        If reference_selections is provided (list of {"bbox": {x1,y1,x2,y2}} from the detection
        frame), we match at reference_frame_index by IoU to determine which track_ids are "selected"
        so the overlay stays correct across different tracking runs.

        Returns:
            dict with:
              - fps, frame_size, total_frames
              - frames: [ { "frame_index", "players": [ {"track_id", "bbox", "is_selected": bool } ] } ]
        """
        def _iou(b1, b2):
            x1 = max(b1["x1"], b2["x1"])
            y1 = max(b1["y1"], b2["y1"])
            x2 = min(b1["x2"], b2["x2"])
            y2 = min(b1["y2"], b2["y2"])
            if x2 <= x1 or y2 <= y1:
                return 0.0
            inter = (x2 - x1) * (y2 - y1)
            a1 = (b1["x2"] - b1["x1"]) * (b1["y2"] - b1["y1"])
            a2 = (b2["x2"] - b2["x1"]) * (b2["y2"] - b2["y1"])
            return inter / (a1 + a2 - inter) if (a1 + a2 - inter) > 0 else 0.0

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        w, h = 0, 0
        frames_out = []
        frame_count = 0

        self.model.predictor = None

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            h, w = frame.shape[:2]

            if frame_count % frame_skip != 0:
                frame_count += 1
                continue

            results = self.model.track(frame, persist=True, classes=[0], verbose=False)
            players = []

            if results[0].boxes is not None and results[0].boxes.id is not None:
                for box, tid in zip(
                    results[0].boxes.xyxy.cpu().numpy(),
                    results[0].boxes.id.cpu().numpy().astype(int),
                ):
                    x1, y1, x2, y2 = box.astype(int).tolist()
                    players.append({
                        "track_id": int(tid),
                        "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    })

            frames_out.append({"frame_index": frame_count, "players": players})
            frame_count += 1

        cap.release()

        # Determine which track_ids are "selected" by matching at reference frame.
        # Each reference selection gets its best-matching track (one-to-one so multiple selections stay distinct).
        selected_track_ids = set()
        if reference_selections and frames_out:
            ref_idx = min(
                range(len(frames_out)),
                key=lambda i: abs(frames_out[i]["frame_index"] - reference_frame_index),
            )
            ref_frame_players = frames_out[ref_idx]["players"]
            assigned_tids = set()
            for sel in reference_selections:
                ref_bbox = sel.get("bbox")
                if not ref_bbox:
                    continue
                best_iou = 0.0
                best_tid = None
                for p in ref_frame_players:
                    if p["track_id"] in assigned_tids:
                        continue
                    iou = _iou(ref_bbox, p["bbox"])
                    if iou > best_iou and iou >= 0.15:
                        best_iou = iou
                        best_tid = p["track_id"]
                if best_tid is not None:
                    selected_track_ids.add(best_tid)
                    assigned_tids.add(best_tid)

        for fr in frames_out:
            for p in fr["players"]:
                p["is_selected"] = p["track_id"] in selected_track_ids

        return {
            "fps": fps,
            "frame_size": {"width": w, "height": h},
            "total_frames": total_frames,
            "frames": frames_out,
        }
