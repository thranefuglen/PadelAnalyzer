// Mock pose data for test video - represents keypoints for stick figure visualization
// In production, this would come from MediaPipe pose detection

export interface PoseKeypoint {
  x: number // normalized 0-1
  y: number // normalized 0-1
  visibility: number // 0-1
}

export interface PoseFrame {
  timestamp: number // milliseconds
  keypoints: PoseKeypoint[]
}

// MediaPipe Pose keypoint indices
export const POSE_CONNECTIONS = [
  [11, 12], // shoulders
  [11, 13], // left shoulder to elbow
  [13, 15], // left elbow to wrist
  [12, 14], // right shoulder to elbow
  [14, 16], // right elbow to wrist
  [11, 23], // left shoulder to hip
  [12, 24], // right shoulder to hip
  [23, 24], // hips
  [23, 25], // left hip to knee
  [25, 27], // left knee to ankle
  [24, 26], // right hip to knee
  [26, 28], // right knee to ankle
]

// Mock pose data for the test video "Single hit.mp4"
// This represents a player in white outfit doing a forehand stroke
export function getMockPoseData(): PoseFrame[] {
  const frames: PoseFrame[] = []
  const frameCount = 40
  const fps = 30

  for (let i = 0; i < frameCount; i++) {
    const t = i / frameCount
    const timestamp = (i / fps) * 1000

    // Simulate a forehand stroke motion
    const swingPhase = Math.sin(t * Math.PI * 2)
    const armExtension = Math.max(0, swingPhase)

    // Create keypoints for stick figure
    // These are normalized coordinates (0-1)
    const keypoints: PoseKeypoint[] = new Array(33).fill(null).map(() => ({
      x: 0.5,
      y: 0.5,
      visibility: 0
    }))

    // Head (nose)
    keypoints[0] = { x: 0.5, y: 0.2, visibility: 0.9 }

    // Shoulders
    keypoints[11] = { x: 0.45, y: 0.35, visibility: 0.95 } // left shoulder
    keypoints[12] = { x: 0.55, y: 0.35, visibility: 0.95 } // right shoulder

    // Elbows (right arm swings)
    keypoints[13] = { x: 0.42, y: 0.45, visibility: 0.9 } // left elbow
    keypoints[14] = {
      x: 0.55 + armExtension * 0.15,
      y: 0.40 + armExtension * 0.05,
      visibility: 0.95
    } // right elbow (swinging)

    // Wrists
    keypoints[15] = { x: 0.40, y: 0.55, visibility: 0.85 } // left wrist
    keypoints[16] = {
      x: 0.55 + armExtension * 0.25,
      y: 0.45 + armExtension * 0.10,
      visibility: 0.95
    } // right wrist (swinging)

    // Hips
    keypoints[23] = { x: 0.46, y: 0.60, visibility: 0.9 } // left hip
    keypoints[24] = { x: 0.54, y: 0.60, visibility: 0.9 } // right hip

    // Knees
    keypoints[25] = { x: 0.45, y: 0.75, visibility: 0.85 } // left knee
    keypoints[26] = { x: 0.55, y: 0.75, visibility: 0.85 } // right knee

    // Ankles
    keypoints[27] = { x: 0.44, y: 0.90, visibility: 0.8 } // left ankle
    keypoints[28] = { x: 0.56, y: 0.90, visibility: 0.8 } // right ankle

    frames.push({ timestamp, keypoints })
  }

  return frames
}
