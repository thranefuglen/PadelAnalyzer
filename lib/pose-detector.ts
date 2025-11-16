// Client-side pose detection using MediaPipe
import { PoseFrame, PoseKeypoint } from './pose-data'

export interface PoseDetectorResult {
  poseData: PoseFrame[]
  fps: number
  totalFrames: number
}

export async function detectPoseFromVideo(
  videoElement: HTMLVideoElement
): Promise<PoseDetectorResult> {
  const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')

  // Initialize MediaPipe Pose
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  )

  const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      delegate: 'GPU'
    },
    runningMode: 'VIDEO',
    numPoses: 1 // Only detect one person (player in white)
  })

  const poseData: PoseFrame[] = []
  const fps = 30
  const duration = videoElement.duration
  const frameInterval = 1 / fps

  // Sample every frame at ~30fps
  for (let time = 0; time < duration; time += frameInterval) {
    videoElement.currentTime = time

    // Wait for video to seek
    await new Promise((resolve) => {
      videoElement.onseeked = resolve
    })

    // Detect pose in current frame
    const timestamp = Math.floor(time * 1000)
    const result = poseLandmarker.detectForVideo(videoElement, timestamp)

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0] // First (and only) person

      // Convert MediaPipe landmarks to our format
      const keypoints: PoseKeypoint[] = landmarks.map((lm) => ({
        x: lm.x,
        y: lm.y,
        visibility: lm.visibility || 0
      }))

      poseData.push({
        timestamp,
        keypoints
      })
    }
  }

  poseLandmarker.close()

  return {
    poseData,
    fps,
    totalFrames: poseData.length
  }
}
