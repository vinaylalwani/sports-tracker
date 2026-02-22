import cv2
import mediapipe as mp
import numpy as np


class PoseEstimator:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils  # optional, for visualization

        # CPU-friendly lightweight pose model
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=0,           # <-- use 0 for CPU
            enable_segmentation=False,    # segmentation off for stability
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def extract_keypoints(self, video_path, frame_skip=3, resize_width=640):
        cap = cv2.VideoCapture(video_path)
        keypoints_sequence = []
        frame_count = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Skip frames if needed
            if frame_count % frame_skip != 0:
                frame_count += 1
                continue

            # Resize frame for CPU stability
            height, width, _ = frame.shape
            if width > resize_width:
                scale = resize_width / width
                frame = cv2.resize(frame, (resize_width, int(height * scale)))

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb)

            if results.pose_landmarks:
                landmarks = [
                    [lm.x, lm.y, lm.z] for lm in results.pose_landmarks.landmark
                ]
                keypoints_sequence.append(np.array(landmarks))

            frame_count += 1

        cap.release()
        return keypoints_sequence