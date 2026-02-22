"""
Player detection + tracking for multi-player footage (e.g., NBA games).
Uses YOLOv8 for person detection with built-in tracking.
Allows user to select which player to track by clicking on them.

Key design: YOLO's BoT-SORT tracker uses appearance (Re-ID) features to maintain
consistent track IDs. We trust those IDs as the primary signal and only fall back
to spatial re-association when an ID disappears entirely.
"""

import cv2
import numpy as np
from collections import deque

try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False


def _iou(b1, b2):
    if isinstance(b1, dict):
        b1 = (b1["x1"], b1["y1"], b1["x2"], b1["y2"])
    if isinstance(b2, dict):
        b2 = (b2["x1"], b2["y1"], b2["x2"], b2["y2"])
    x1 = max(b1[0], b2[0])
    y1 = max(b1[1], b2[1])
    x2 = min(b1[2], b2[2])
    y2 = min(b1[3], b2[3])
    if x2 <= x1 or y2 <= y1:
        return 0.0
    inter = (x2 - x1) * (y2 - y1)
    a1 = (b1[2] - b1[0]) * (b1[3] - b1[1])
    a2 = (b2[2] - b2[0]) * (b2[3] - b2[1])
    return inter / (a1 + a2 - inter) if (a1 + a2 - inter) > 0 else 0.0


def _center(bbox):
    if isinstance(bbox, dict):
        return ((bbox["x1"] + bbox["x2"]) / 2.0, (bbox["y1"] + bbox["y2"]) / 2.0)
    return ((bbox[0] + bbox[2]) / 2.0, (bbox[1] + bbox[3]) / 2.0)


def _bbox_size(bbox):
    if isinstance(bbox, dict):
        return (bbox["x2"] - bbox["x1"], bbox["y2"] - bbox["y1"])
    return (bbox[2] - bbox[0], bbox[3] - bbox[1])


def _center_dist(b1, b2):
    c1 = _center(b1)
    c2 = _center(b2)
    return np.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2)


def _edge_dist(b1, b2):
    """
    Minimum distance between the edges of two bounding boxes.
    Returns 0 if they overlap. Handles sideways falls where
    the new bbox is adjacent to the old one.
    """
    b1 = _to_tuple(b1)
    b2 = _to_tuple(b2)
    # Horizontal gap
    dx = max(0, max(b1[0], b2[0]) - min(b1[2], b2[2]))
    # Vertical gap
    dy = max(0, max(b1[1], b2[1]) - min(b1[3], b2[3]))
    return np.sqrt(dx * dx + dy * dy)


def _to_tuple(bbox):
    if isinstance(bbox, dict):
        return (bbox["x1"], bbox["y1"], bbox["x2"], bbox["y2"])
    return tuple(bbox)


class _SimpleTracker:
    """
    Lightweight tracker that primarily trusts YOLO's track IDs.
    Only uses spatial fallback when the current ID has been missing
    for several consecutive frames (grace period).
    """

    def __init__(self, track_id, bbox=None):
        self.current_id = track_id
        self.last_bbox = _to_tuple(bbox) if bbox else None
        self.frames_lost = 0
        self._avg_w = _bbox_size(bbox)[0] if bbox else 60
        self._avg_h = _bbox_size(bbox)[1] if bbox else 120
        # Grace period: how many frames to wait (trusting YOLO to recover)
        # before attempting spatial re-association
        self._grace_frames = 4
        # After spatial fallback, require the new ID to appear this many
        # consecutive frames before fully committing
        self._pending_id = None
        self._pending_bbox = None
        self._pending_count = 0
        self._pending_needed = 2  # must see new ID 2 consecutive frames

    def update(self, track_ids, boxes_xyxy, frame_w, frame_h, max_lost, excluded_ids=None):
        if excluded_ids is None:
            excluded_ids = set()

        if len(track_ids) == 0:
            self.frames_lost += 1
            self._pending_id = None
            self._pending_count = 0
            return None, None

        # Step 1: Look for our current YOLO ID (trust YOLO's appearance matching)
        for i in range(len(track_ids)):
            tid = int(track_ids[i])
            if tid == self.current_id and tid not in excluded_ids:
                box = boxes_xyxy[i].astype(int).tolist()
                if self.last_bbox is not None:
                    diag = np.sqrt(frame_w ** 2 + frame_h ** 2)
                    dist = _center_dist(self.last_bbox, box)
                    if dist > diag * 0.25:
                        continue
                self._accept(box, tid)
                self._pending_id = None
                self._pending_count = 0
                return tuple(box), tid

        # Step 1b: If we have a pending ID from a recent spatial match,
        # check if that pending ID is still present (confirmation)
        if self._pending_id is not None:
            for i in range(len(track_ids)):
                tid = int(track_ids[i])
                if tid == self._pending_id and tid not in excluded_ids:
                    box = boxes_xyxy[i].astype(int).tolist()
                    if self._pending_bbox is not None:
                        dist = _center_dist(self._pending_bbox, box)
                        diag = np.sqrt(frame_w ** 2 + frame_h ** 2)
                        if dist > diag * 0.15:
                            continue
                    self._pending_count += 1
                    self._pending_bbox = tuple(box)
                    if self._pending_count >= self._pending_needed:
                        # Confirmed — adopt this ID
                        self._accept(box, tid)
                        self._pending_id = None
                        self._pending_count = 0
                        return tuple(box), tid
                    else:
                        # Not yet confirmed, but return it tentatively
                        self.last_bbox = tuple(box)
                        self.frames_lost = 0
                        return tuple(box), tid
            # Pending ID not found — reset pending
            self._pending_id = None
            self._pending_count = 0

        # Step 2: Grace period — don't spatial-fallback for the first few frames.
        # YOLO's tracker usually recovers the ID within 1-3 frames.
        if self.frames_lost < self._grace_frames:
            self.frames_lost += 1
            return None, None

        # Step 3: Spatial fallback — only after grace period expires
        if self.last_bbox is None or self.frames_lost >= max_lost:
            self.frames_lost += 1
            return None, None

        diag = np.sqrt(frame_w ** 2 + frame_h ** 2)
        body_extent = max(self._avg_w, self._avg_h, 50)
        max_dist = min(
            body_extent * (3.0 + (self.frames_lost - self._grace_frames) * 0.5),
            diag * 0.20
        )

        best_i = None
        best_score = -1.0

        for i in range(len(track_ids)):
            tid = int(track_ids[i])
            if tid in excluded_ids:
                continue
            candidate = boxes_xyxy[i].astype(int).tolist()

            center_d = _center_dist(self.last_bbox, candidate)
            edge_d = _edge_dist(self.last_bbox, candidate)
            dist = min(center_d, edge_d)

            if dist > max_dist:
                continue

            csz = _bbox_size(candidate)
            if self._avg_w > 0:
                avg_area = self._avg_w * self._avg_h
                cand_area = csz[0] * csz[1]
                area_ratio = cand_area / (avg_area + 1e-6)
                if area_ratio < 0.2 or area_ratio > 5.0:
                    continue

            iou = _iou(self.last_bbox, candidate)
            center_score = max(0.0, 1.0 - center_d / max_dist)
            edge_score = max(0.0, 1.0 - edge_d / max_dist)
            score = iou * 0.5 + edge_score * 0.3 + center_score * 0.2

            if score > best_score:
                best_score = score
                best_i = i

        # Require a meaningful score to even start the pending process
        if best_i is not None and best_score > 0.15:
            box = boxes_xyxy[best_i].astype(int).tolist()
            new_id = int(track_ids[best_i])
            # Don't immediately commit — start pending confirmation
            self._pending_id = new_id
            self._pending_bbox = tuple(box)
            self._pending_count = 1
            if self._pending_count >= self._pending_needed:
                self._accept(box, new_id)
                self._pending_id = None
                self._pending_count = 0
                return tuple(box), new_id
            else:
                # Tentatively use this box but don't change current_id yet
                self.last_bbox = tuple(box)
                self.frames_lost = 0
                return tuple(box), new_id

        self.frames_lost += 1
        return None, None

    def _accept(self, box, tid):
        self.last_bbox = tuple(box)
        self.current_id = tid
        self.frames_lost = 0
        sz = _bbox_size(box)
        alpha = 0.15
        self._avg_w = self._avg_w * (1 - alpha) + sz[0] * alpha
        self._avg_h = self._avg_h * (1 - alpha) + sz[1] * alpha


class PlayerTracker:
    def __init__(self, model_size="yolov8n.pt"):
        if not HAS_YOLO:
            raise ImportError(
                "ultralytics is required for player tracking.\n"
                "Install with: pip install ultralytics"
            )
        self.model = YOLO(model_size)
        self.target_track_id = None

    def select_player_interactive(self, video_path, frame_idx=0):
        cap = cv2.VideoCapture(video_path)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            cap.release()
            raise RuntimeError(f"Cannot read frame {frame_idx}")

        results = self.model.track(frame, persist=True, classes=[0], verbose=False)
        boxes = []
        if results[0].boxes is not None and results[0].boxes.id is not None:
            for box, track_id in zip(results[0].boxes.xyxy.cpu().numpy(),
                                      results[0].boxes.id.cpu().numpy().astype(int)):
                x1, y1, x2, y2 = box.astype(int)
                boxes.append({"bbox": (x1, y1, x2, y2), "track_id": int(track_id)})

        if not boxes:
            cap.release()
            raise RuntimeError("No players detected in frame.")

        display = frame.copy()
        for b in boxes:
            x1, y1, x2, y2 = b["bbox"]
            cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(display, f"ID:{b['track_id']}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        selected_id = [None]

        def on_click(event, x, y, flags, param):
            if event == cv2.EVENT_LBUTTONDOWN:
                for b in boxes:
                    bx1, by1, bx2, by2 = b["bbox"]
                    if bx1 <= x <= bx2 and by1 <= y <= by2:
                        selected_id[0] = b["track_id"]
                        break

        window_name = "Click on the target player then press any key"
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, 1280, 720)
        cv2.setMouseCallback(window_name, on_click)
        cv2.imshow(window_name, display)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        cap.release()

        if selected_id[0] is None:
            raise RuntimeError("No player selected.")

        self.target_track_id = selected_id[0]
        return self.target_track_id

    def set_target_track_id(self, track_id):
        self.target_track_id = track_id

    def extract_player_crops(self, video_path, frame_skip=3, resize_width=640, padding=50):
        if self.target_track_id is None:
            raise RuntimeError("No target player selected.")

        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        crops = []
        bboxes = []
        frame_indices = []
        frame_count = 0
        w, h = 0, 0

        max_lost = max(15, int((fps / max(frame_skip, 1)) * 3.0))
        tracker = _SimpleTracker(self.target_track_id)

        self.model.predictor = None

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            h, w, _ = frame.shape

            if frame_count % frame_skip != 0:
                frame_count += 1
                continue

            results = self.model.track(frame, persist=True, classes=[0], verbose=False)

            track_ids = np.array([], dtype=int)
            boxes_xyxy = np.array([]).reshape(0, 4)
            if results[0].boxes is not None and results[0].boxes.id is not None:
                track_ids = results[0].boxes.id.cpu().numpy().astype(int)
                boxes_xyxy = results[0].boxes.xyxy.cpu().numpy()

            matched_box, _ = tracker.update(track_ids, boxes_xyxy, w, h, max_lost)

            if matched_box is not None:
                x1, y1, x2, y2 = matched_box
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

        if crops:
            print(f"[TRACKER] Extracted {len(crops)} crops. "
                  f"Sizes: min={min(c.shape[:2] for c in crops)}, max={max(c.shape[:2] for c in crops)}")
        else:
            print("[TRACKER] No crops extracted!")

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
        Single-pass: run YOLO tracking once, trust YOLO IDs, use _SimpleTracker
        only to handle ID disappearances. No second pass needed.
        """
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0
        w, h = 0, 0
        frames_out = []
        frame_count = 0

        self.model.predictor = None

        # We need to know which YOLO IDs correspond to selected players.
        # Strategy: process all frames, at the reference frame match selections
        # to YOLO IDs, then track those IDs forward/backward using _SimpleTracker.

        # But since YOLO tracking is sequential (persist=True), we must process
        # frames in order. So we do ONE forward pass, collecting everything.

        # Identify selected YOLO IDs at reference frame, then for all frames
        # after that point, use _SimpleTracker. For frames before the reference,
        # we'll do a second YOLO pass in reverse... but YOLO doesn't support reverse.
        #
        # Simplest correct approach: single forward pass. At reference frame,
        # initialize trackers. Before reference frame, mark nothing (or mark by
        # raw ID if we can). After reference frame, track with _SimpleTracker.

        # Phase 1: collect all raw YOLO detections in forward order
        all_raw = []  # list of (frame_index, track_ids_array, boxes_array, players_list)
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
            raw_ids = np.array([], dtype=int)
            raw_boxes = np.array([]).reshape(0, 4)

            if results[0].boxes is not None and results[0].boxes.id is not None:
                raw_ids = results[0].boxes.id.cpu().numpy().astype(int)
                raw_boxes = results[0].boxes.xyxy.cpu().numpy()
                for box, tid in zip(raw_boxes, raw_ids):
                    x1, y1, x2, y2 = box.astype(int).tolist()
                    players.append({
                        "track_id": int(tid),
                        "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                        "is_selected": False,
                    })

            all_raw.append((frame_count, raw_ids, raw_boxes, players))
            frame_count += 1

        cap.release()

        if not all_raw:
            return {"fps": fps, "frame_size": {"width": w, "height": h},
                    "total_frames": total_frames, "frames": []}

        # Phase 2: find reference frame, match selections to YOLO IDs
        ref_raw_idx = min(
            range(len(all_raw)),
            key=lambda i: abs(all_raw[i][0] - reference_frame_index),
        )

        # Map: selected player index -> YOLO track_id at reference frame
        selected_initial_ids = {}  # idx -> (track_id, bbox_tuple)
        if reference_selections:
            ref_players = all_raw[ref_raw_idx][3]
            assigned = set()
            for sel_idx, sel in enumerate(reference_selections):
                ref_bbox = sel.get("bbox")
                if not ref_bbox:
                    continue
                best_iou = 0.0
                best_p = None
                for p in ref_players:
                    if p["track_id"] in assigned:
                        continue
                    iou_val = _iou(ref_bbox, p["bbox"])
                    if iou_val > best_iou and iou_val >= 0.10:
                        best_iou = iou_val
                        best_p = p
                if best_p is not None:
                    bb = best_p["bbox"]
                    selected_initial_ids[sel_idx] = (
                        best_p["track_id"],
                        (bb["x1"], bb["y1"], bb["x2"], bb["y2"])
                    )
                    assigned.add(best_p["track_id"])

        # Phase 3: run _SimpleTracker forward from reference frame
        max_lost = max(20, int((fps / max(frame_skip, 1)) * 4.0))

        # Forward trackers
        fwd_trackers = []
        for sel_idx in sorted(selected_initial_ids.keys()):
            tid, bbox = selected_initial_ids[sel_idx]
            fwd_trackers.append(_SimpleTracker(tid, bbox))

        # Track which track_id is selected in each raw frame
        # frame_selected[raw_idx] = set of selected track_ids
        frame_selected = [set() for _ in all_raw]

        # Mark reference frame
        for sel_idx in selected_initial_ids:
            tid, _ = selected_initial_ids[sel_idx]
            frame_selected[ref_raw_idx].add(tid)

        # Forward: ref+1 to end
        for ri in range(ref_raw_idx + 1, len(all_raw)):
            _, raw_ids, raw_boxes, _ = all_raw[ri]
            claimed_ids = set()
            for tr in fwd_trackers:
                matched, tid = tr.update(raw_ids, raw_boxes, w, h, max_lost, excluded_ids=claimed_ids)
                if tid is not None:
                    frame_selected[ri].add(tid)
                    claimed_ids.add(tid)

        # Backward: ref-1 to start
        # Create fresh trackers seeded from reference
        bwd_trackers = []
        for sel_idx in sorted(selected_initial_ids.keys()):
            tid, bbox = selected_initial_ids[sel_idx]
            bwd_trackers.append(_SimpleTracker(tid, bbox))

        for ri in range(ref_raw_idx - 1, -1, -1):
            _, raw_ids, raw_boxes, _ = all_raw[ri]
            claimed_ids = set()
            for tr in bwd_trackers:
                matched, tid = tr.update(raw_ids, raw_boxes, w, h, max_lost, excluded_ids=claimed_ids)
                if tid is not None:
                    frame_selected[ri].add(tid)
                    claimed_ids.add(tid)

        # Phase 4: build output
        frames_out = []
        for ri, (fi, _, _, players) in enumerate(all_raw):
            sel_ids = frame_selected[ri]
            for p in players:
                p["is_selected"] = p["track_id"] in sel_ids
            frames_out.append({"frame_index": fi, "players": players})

        return {
            "fps": fps,
            "frame_size": {"width": w, "height": h},
            "total_frames": total_frames,
            "frames": frames_out,
        }
