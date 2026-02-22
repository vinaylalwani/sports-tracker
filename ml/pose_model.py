import cv2
import mediapipe as mp
import numpy as np
import ssl
import certifi
import urllib.request

# Fix macOS SSL certificate issue for MediaPipe model downloads
ssl_context = ssl.create_default_context(cafile=certifi.where())
urllib.request.install_opener(
    urllib.request.build_opener(
        urllib.request.HTTPSHandler(context=ssl_context)
    )
)

class PoseEstimator:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils

        # For video (temporal smoothing)
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=0,
            enable_segmentation=False,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        # For individual crops (no temporal context — works much better on single frames)
        self.pose_static = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,            # higher accuracy for crops
            enable_segmentation=False,
            smooth_landmarks=False,
            min_detection_confidence=0.3,   # lower threshold — crops may be noisy
            min_tracking_confidence=0.3,
        )

    def extract_keypoints(self, video_path, frame_skip=3, resize_width=640):
        """
        Returns dict with:
          - keypoints: list of (33, 4) numpy arrays (normalized x, y, z, visibility)
          - fps: original video FPS
          - frame_indices: which frame numbers were processed
          - frame_size: (width, height) after resize
        """
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        keypoints_sequence = []
        frame_indices = []
        frame_count = 0
        actual_size = (resize_width, resize_width)

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % frame_skip != 0:
                frame_count += 1
                continue

            height, width, _ = frame.shape
            if width > resize_width:
                scale = resize_width / width
                new_h = int(height * scale)
                frame = cv2.resize(frame, (resize_width, new_h))
                actual_size = (resize_width, new_h)
            else:
                actual_size = (width, height)

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb)

            if results.pose_landmarks:
                landmarks = [
                    [lm.x, lm.y, lm.z, lm.visibility]
                    for lm in results.pose_landmarks.landmark
                ]
                keypoints_sequence.append(np.array(landmarks))
                frame_indices.append(frame_count)

            frame_count += 1

        cap.release()

        effective_fps = fps / frame_skip

        return {
            "keypoints": keypoints_sequence,
            "fps": fps,
            "effective_fps": effective_fps,
            "frame_indices": frame_indices,
            "frame_size": actual_size,
            "total_frames": frame_count,
        }

    @staticmethod
    def _resize_crop_for_pose(crop, min_height=300, min_width=200):
        """
        Resize a crop upward if it's too small for reliable pose detection.
        MediaPipe works best with images where the person is at least ~256px tall.
        """
        h, w = crop.shape[:2]
        scale = 1.0
        if h < min_height:
            scale = max(scale, min_height / h)
        if w < min_width:
            scale = max(scale, min_width / w)

        if scale > 1.0:
            new_w = int(w * scale)
            new_h = int(h * scale)
            crop = cv2.resize(crop, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

        return crop

    def extract_keypoints_from_crops(self, crops, bboxes, frame_indices,
                                      fps=30.0, effective_fps=10.0, original_frame_size=(1920, 1080)):
        """
        Run pose estimation on pre-cropped player images.
        Uses static_image_mode for better per-frame detection.
        Resizes small crops upward for reliable landmark detection.
        Landmarks are mapped back to full-frame normalized coordinates.
        """
        keypoints_sequence = []
        valid_frame_indices = []
        full_w, full_h = original_frame_size
        detect_count = 0
        fail_count = 0

        for i, (crop, bbox) in enumerate(zip(crops, bboxes)):
            if crop is None or crop.size == 0:
                fail_count += 1
                continue

            # Resize small crops for better pose detection
            processed_crop = self._resize_crop_for_pose(crop)

            rgb = cv2.cvtColor(processed_crop, cv2.COLOR_BGR2RGB)
            results = self.pose_static.process(rgb)

            if results.pose_landmarks:
                ox1, oy1, ox2, oy2 = bbox
                crop_h, crop_w = crop.shape[:2]  # use original crop dims for mapping

                landmarks = []
                for lm in results.pose_landmarks.landmark:
                    abs_x = ox1 + lm.x * crop_w
                    abs_y = oy1 + lm.y * crop_h
                    norm_x = abs_x / full_w
                    norm_y = abs_y / full_h
                    landmarks.append([norm_x, norm_y, lm.z, lm.visibility])

                keypoints_sequence.append(np.array(landmarks))
                valid_frame_indices.append(frame_indices[i])
                detect_count += 1
            else:
                fail_count += 1

        print(f"[DEBUG] Pose detection: {detect_count}/{detect_count + fail_count} crops succeeded")

        return {
            "keypoints": keypoints_sequence,
            "fps": fps,
            "effective_fps": effective_fps,
            "frame_indices": valid_frame_indices,
            "frame_size": original_frame_size,
            "total_frames": max(frame_indices) + 1 if frame_indices else 0,
        }