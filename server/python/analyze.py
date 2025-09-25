#!/usr/bin/env python3
import argparse
import json
import sys
import os
import math
import numpy as np

# Try to import MediaPipe and OpenCV
try:
    import mediapipe as mp
    import cv2
    HAS_MEDIAPIPE = True
except ImportError:
    print("MediaPipe not available, using fallback analysis", file=sys.stderr)
    try:
        import cv2
        HAS_OPENCV = True
    except ImportError:
        HAS_OPENCV = False
    HAS_MEDIAPIPE = False

def get_video_info(video_path):
    """Get basic video information"""
    if HAS_OPENCV:
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_ms = (frame_count / fps) * 1000 if fps > 0 else 5000
        cap.release()
        return {"fps": fps, "frame_count": frame_count, "duration_ms": duration_ms}
    else:
        # Fallback: assume 30fps, 5 second video
        return {"fps": 30, "frame_count": 150, "duration_ms": 5000}

def calculate_angle(a, b, c):
    """Calculate angle between three points"""
    try:
        a, b, c = np.array(a), np.array(b), np.array(c)
        radians = np.arctan2(c[1] - b[1], c[0] - b[0]) - np.arctan2(a[1] - b[1], a[0] - b[0])
        angle = np.abs(radians * 180.0 / np.pi)
        if angle > 180.0:
            angle = 360 - angle
        return angle
    except:
        return 90.0  # Default fallback angle

def calculate_shoulder_rotation(left_shoulder, right_shoulder):
    """Calculate shoulder rotation proxy from shoulder positions"""
    try:
        dx = right_shoulder[0] - left_shoulder[0]
        dy = right_shoulder[1] - left_shoulder[1]
        angle = math.atan2(dy, dx) * 180 / math.pi
        return angle
    except:
        return 0.0

def analyze_with_mediapipe(video_path, sample_ms=100):
    """Analyze video using MediaPipe Pose"""
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_interval = int((sample_ms / 1000.0) * fps)
    if frame_interval < 1:
        frame_interval = 1

    tempo_series = []
    angles = []
    shoulder_rotations = []
    frame_count = 0
    processed_frames = 0

    prev_landmarks = None

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_interval == 0:
            # Convert BGR to RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(rgb_frame)

            timestamp_ms = (frame_count / fps) * 1000

            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark

                # Get key points
                left_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y]
                right_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].x, landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].y]
                right_elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].x, landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW].y]
                right_wrist = [landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].x, landmarks[mp_pose.PoseLandmark.RIGHT_WRIST].y]

                # Calculate elbow angle
                elbow_angle = calculate_angle(right_shoulder, right_elbow, right_wrist)
                angles.append(elbow_angle)

                # Calculate shoulder rotation
                shoulder_rot = calculate_shoulder_rotation(left_shoulder, right_shoulder)
                shoulder_rotations.append(shoulder_rot)

                # Calculate tempo (movement intensity)
                tempo = 0.0
                if prev_landmarks:
                    # Calculate movement between frames
                    total_movement = 0.0
                    for i, landmark in enumerate(landmarks):
                        if i < len(prev_landmarks):
                            dx = landmark.x - prev_landmarks[i].x
                            dy = landmark.y - prev_landmarks[i].y
                            total_movement += math.sqrt(dx*dx + dy*dy)
                    tempo = total_movement * 1000  # Scale for visibility

                tempo_series.append([timestamp_ms, tempo])
                prev_landmarks = landmarks
                processed_frames += 1
            else:
                # No pose detected, add default values
                angles.append(90.0)
                shoulder_rotations.append(0.0)
                tempo_series.append([timestamp_ms, 0.0])

        frame_count += 1

    cap.release()
    pose.close()

    # Calculate metrics
    elbow_angle_max = max(angles) if angles else 90.0
    shoulder_rotation_proxy = np.mean(shoulder_rotations) if shoulder_rotations else 0.0

    # Find impact frames (peaks in tempo)
    impact_frames = []
    if len(tempo_series) > 2:
        tempo_values = [t[1] for t in tempo_series]
        mean_tempo = np.mean(tempo_values)
        std_tempo = np.std(tempo_values)
        threshold = mean_tempo + std_tempo

        for i, (timestamp, tempo) in enumerate(tempo_series):
            if tempo > threshold:
                impact_frames.append(timestamp)

    # Guess stroke type based on shoulder rotation
    stroke_guess = "unknown"
    confidence = 0.3
    if abs(shoulder_rotation_proxy) > 5:
        stroke_guess = "forehand" if shoulder_rotation_proxy > 0 else "backhand"
        confidence = 0.6

    return {
        "summary": {
            "strokeGuess": stroke_guess,
            "confidence": confidence
        },
        "metrics": {
            "elbowAngleMax": round(elbow_angle_max, 1),
            "shoulderRotationProxy": round(shoulder_rotation_proxy, 1),
            "tempoSeries": tempo_series,
            "impactFrames": impact_frames[:3]  # Limit to first 3 impacts
        },
        "meta": {
            "fps": fps,
            "sampleMs": sample_ms,
            "framesUsed": processed_frames
        }
    }

def analyze_fallback(video_path, sample_ms=100):
    """Fallback analysis without MediaPipe"""
    video_info = get_video_info(video_path)
    fps = video_info["fps"]
    duration_ms = video_info["duration_ms"]

    # Generate synthetic tempo series
    tempo_series = []
    num_samples = int(duration_ms / sample_ms)

    for i in range(num_samples):
        timestamp = i * sample_ms
        # Create a synthetic tempo curve with some peaks
        tempo = 20 + 30 * math.sin(timestamp / 1000 * 2) + 10 * math.sin(timestamp / 1000 * 8)
        tempo = max(0, tempo)
        tempo_series.append([timestamp, round(tempo, 1)])

    # Synthetic impact frames
    impact_frames = [800, 2200, 3600] if duration_ms > 4000 else [800, 2200]

    return {
        "summary": {
            "strokeGuess": "forehand",
            "confidence": 0.4
        },
        "metrics": {
            "elbowAngleMax": 145.0,
            "shoulderRotationProxy": 8.5,
            "tempoSeries": tempo_series,
            "impactFrames": impact_frames
        },
        "meta": {
            "fps": fps,
            "sampleMs": sample_ms,
            "framesUsed": num_samples,
            "fallback": True
        }
    }

def main():
    parser = argparse.ArgumentParser(description="Analyze padel video for pose metrics")
    parser.add_argument("--video", required=True, help="Path to video file")
    parser.add_argument("--out", required=True, help="Output JSON file path")
    parser.add_argument("--sample_ms", type=int, default=100, help="Sampling interval in milliseconds")

    args = parser.parse_args()

    if not os.path.exists(args.video):
        print(f"Error: Video file not found: {args.video}", file=sys.stderr)
        sys.exit(1)

    try:
        if HAS_MEDIAPIPE:
            print("Using MediaPipe analysis", file=sys.stderr)
            result = analyze_with_mediapipe(args.video, args.sample_ms)
        else:
            print("Using fallback analysis", file=sys.stderr)
            result = analyze_fallback(args.video, args.sample_ms)

        # Write results
        os.makedirs(os.path.dirname(args.out), exist_ok=True)
        with open(args.out, 'w') as f:
            json.dump(result, f, indent=2)

        print(f"Analysis complete: {args.out}", file=sys.stderr)
        print(json.dumps({"status": "success", "output": args.out}))

    except Exception as e:
        print(f"Error during analysis: {str(e)}", file=sys.stderr)
        error_result = {
            "status": "error",
            "error": str(e),
            "summary": {"strokeGuess": "unknown", "confidence": 0.0},
            "metrics": {"elbowAngleMax": 0, "shoulderRotationProxy": 0, "tempoSeries": [], "impactFrames": []},
            "meta": {"fps": 30, "sampleMs": args.sample_ms, "framesUsed": 0}
        }
        with open(args.out, 'w') as f:
            json.dump(error_result, f, indent=2)
        sys.exit(1)

if __name__ == "__main__":
    main()