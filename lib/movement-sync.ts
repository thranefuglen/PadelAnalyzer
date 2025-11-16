import { PoseFrame } from './pose-data'

// Key pose types for padel shots
export enum KeyPoseType {
  PREPARATION = 'preparation',
  BACKSWING_PEAK = 'backswing_peak',
  BALL_CONTACT = 'ball_contact',
  FOLLOW_THROUGH = 'follow_through',
  FINISH = 'finish'
}

export interface KeyPose {
  frameIndex: number
  type: KeyPoseType
  timestamp: number
  confidence: number
}

export interface SyncMapping {
  userFrame: number
  referenceFrame: number
}

/**
 * Calculate wrist velocity to detect key moments in the swing
 */
function calculateWristVelocity(frames: PoseFrame[], frameIndex: number): number {
  if (frameIndex === 0 || frameIndex >= frames.length - 1) return 0

  const prev = frames[frameIndex - 1]
  const curr = frames[frameIndex]
  const next = frames[frameIndex + 1]

  // Use right wrist (index 16) for velocity calculation
  const prevWrist = prev.keypoints[16]
  const currWrist = curr.keypoints[16]
  const nextWrist = next.keypoints[16]

  if (!prevWrist || !currWrist || !nextWrist ||
      prevWrist.visibility < 0.5 || currWrist.visibility < 0.5 || nextWrist.visibility < 0.5) {
    return 0
  }

  // Calculate velocity using central difference
  const dx = nextWrist.x - prevWrist.x
  const dy = nextWrist.y - prevWrist.y
  const dt = (next.timestamp - prev.timestamp) / 1000 // Convert to seconds

  if (dt === 0) return 0

  return Math.sqrt(dx * dx + dy * dy) / dt
}

/**
 * Calculate elbow angle to detect swing phases
 */
function calculateElbowAngle(frame: PoseFrame): number {
  // Right shoulder (12), right elbow (14), right wrist (16)
  const shoulder = frame.keypoints[12]
  const elbow = frame.keypoints[14]
  const wrist = frame.keypoints[16]

  if (!shoulder || !elbow || !wrist ||
      shoulder.visibility < 0.5 || elbow.visibility < 0.5 || wrist.visibility < 0.5) {
    return 0
  }

  // Vector from elbow to shoulder
  const v1x = shoulder.x - elbow.x
  const v1y = shoulder.y - elbow.y

  // Vector from elbow to wrist
  const v2x = wrist.x - elbow.x
  const v2y = wrist.y - elbow.y

  // Calculate angle using dot product
  const dot = v1x * v2x + v1y * v2y
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y)
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y)

  if (mag1 === 0 || mag2 === 0) return 0

  const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI)
  return angle
}

/**
 * Detect key poses in a sequence of frames
 */
export function detectKeyPoses(frames: PoseFrame[]): KeyPose[] {
  const keyPoses: KeyPose[] = []
  const velocities: number[] = []

  // Calculate velocities for all frames
  for (let i = 0; i < frames.length; i++) {
    velocities.push(calculateWristVelocity(frames, i))
  }

  // Find peak velocity (likely ball contact)
  let maxVelocity = 0
  let maxVelocityIndex = 0
  for (let i = 0; i < velocities.length; i++) {
    if (velocities[i] > maxVelocity) {
      maxVelocity = velocities[i]
      maxVelocityIndex = i
    }
  }

  if (maxVelocity > 0) {
    keyPoses.push({
      frameIndex: maxVelocityIndex,
      type: KeyPoseType.BALL_CONTACT,
      timestamp: frames[maxVelocityIndex].timestamp,
      confidence: 0.9
    })

    // Find preparation (low velocity before contact)
    for (let i = 0; i < maxVelocityIndex; i++) {
      if (velocities[i] < maxVelocity * 0.1) {
        keyPoses.push({
          frameIndex: i,
          type: KeyPoseType.PREPARATION,
          timestamp: frames[i].timestamp,
          confidence: 0.7
        })
        break
      }
    }

    // Find backswing peak (smallest elbow angle before contact)
    let minElbowAngle = 180
    let minElbowIndex = 0
    const searchStart = Math.max(0, maxVelocityIndex - 15)
    for (let i = searchStart; i < maxVelocityIndex; i++) {
      const angle = calculateElbowAngle(frames[i])
      if (angle > 0 && angle < minElbowAngle) {
        minElbowAngle = angle
        minElbowIndex = i
      }
    }
    if (minElbowAngle < 180) {
      keyPoses.push({
        frameIndex: minElbowIndex,
        type: KeyPoseType.BACKSWING_PEAK,
        timestamp: frames[minElbowIndex].timestamp,
        confidence: 0.8
      })
    }

    // Find follow-through (velocity decreasing after contact)
    for (let i = maxVelocityIndex + 1; i < velocities.length; i++) {
      if (velocities[i] < maxVelocity * 0.3) {
        keyPoses.push({
          frameIndex: i,
          type: KeyPoseType.FOLLOW_THROUGH,
          timestamp: frames[i].timestamp,
          confidence: 0.75
        })
        break
      }
    }

    // Finish is typically the last frame
    if (frames.length > 0) {
      keyPoses.push({
        frameIndex: frames.length - 1,
        type: KeyPoseType.FINISH,
        timestamp: frames[frames.length - 1].timestamp,
        confidence: 0.6
      })
    }
  }

  // Sort by frame index
  return keyPoses.sort((a, b) => a.frameIndex - b.frameIndex)
}

/**
 * Create a frame mapping between user and reference videos based on key poses
 */
export function createMovementSyncMapping(
  userFrames: PoseFrame[],
  referenceFrames: PoseFrame[]
): SyncMapping[] {
  const userKeyPoses = detectKeyPoses(userFrames)
  const refKeyPoses = detectKeyPoses(referenceFrames)

  console.log('User key poses:', userKeyPoses)
  console.log('Reference key poses:', refKeyPoses)

  // If no key poses detected, fall back to linear mapping
  if (userKeyPoses.length === 0 || refKeyPoses.length === 0) {
    return createLinearMapping(userFrames.length, referenceFrames.length)
  }

  const mapping: SyncMapping[] = []

  // Create segments between key poses
  const segments: Array<{
    userStart: number
    userEnd: number
    refStart: number
    refEnd: number
  }> = []

  // Match key poses by type
  const poseTypes = [
    KeyPoseType.PREPARATION,
    KeyPoseType.BACKSWING_PEAK,
    KeyPoseType.BALL_CONTACT,
    KeyPoseType.FOLLOW_THROUGH,
    KeyPoseType.FINISH
  ]

  for (let i = 0; i < poseTypes.length - 1; i++) {
    const userPose = userKeyPoses.find(p => p.type === poseTypes[i])
    const userNextPose = userKeyPoses.find(p => p.type === poseTypes[i + 1])
    const refPose = refKeyPoses.find(p => p.type === poseTypes[i])
    const refNextPose = refKeyPoses.find(p => p.type === poseTypes[i + 1])

    if (userPose && userNextPose && refPose && refNextPose) {
      segments.push({
        userStart: userPose.frameIndex,
        userEnd: userNextPose.frameIndex,
        refStart: refPose.frameIndex,
        refEnd: refNextPose.frameIndex
      })
    }
  }

  // If no segments created, fall back to linear mapping
  if (segments.length === 0) {
    return createLinearMapping(userFrames.length, referenceFrames.length)
  }

  // Create mapping for each segment
  for (const segment of segments) {
    const userSegmentLength = segment.userEnd - segment.userStart
    const refSegmentLength = segment.refEnd - segment.refStart

    for (let i = 0; i <= userSegmentLength; i++) {
      const userFrame = segment.userStart + i
      const progress = userSegmentLength > 0 ? i / userSegmentLength : 0
      const refFrame = Math.round(segment.refStart + progress * refSegmentLength)

      mapping.push({
        userFrame,
        referenceFrame: Math.min(refFrame, referenceFrames.length - 1)
      })
    }
  }

  // Fill in any gaps at the beginning
  if (mapping.length > 0 && mapping[0].userFrame > 0) {
    for (let i = 0; i < mapping[0].userFrame; i++) {
      mapping.unshift({
        userFrame: i,
        referenceFrame: 0
      })
    }
  }

  // Fill in any gaps at the end
  if (mapping.length > 0) {
    const lastMapping = mapping[mapping.length - 1]
    for (let i = lastMapping.userFrame + 1; i < userFrames.length; i++) {
      mapping.push({
        userFrame: i,
        referenceFrame: Math.min(referenceFrames.length - 1, lastMapping.referenceFrame + 1)
      })
    }
  }

  return mapping.sort((a, b) => a.userFrame - b.userFrame)
}

/**
 * Create a simple linear mapping as fallback
 */
function createLinearMapping(userLength: number, refLength: number): SyncMapping[] {
  const mapping: SyncMapping[] = []

  for (let i = 0; i < userLength; i++) {
    const progress = userLength > 1 ? i / (userLength - 1) : 0
    const refFrame = Math.round(progress * (refLength - 1))

    mapping.push({
      userFrame: i,
      referenceFrame: Math.max(0, Math.min(refFrame, refLength - 1))
    })
  }

  return mapping
}

/**
 * Calculate the optimal time offset to synchronize videos based on all key poses
 * Uses least squares method to find the best single offset across all key points
 * Returns the time offset in milliseconds (how much to offset the reference video)
 * Positive offset means reference video should start later
 * Negative offset means reference video should start earlier
 */
export function calculateTimeOffset(
  userFrames: PoseFrame[],
  referenceFrames: PoseFrame[]
): number {
  const userKeyPoses = detectKeyPoses(userFrames)
  const refKeyPoses = detectKeyPoses(referenceFrames)

  console.log('User key poses:', userKeyPoses)
  console.log('Reference key poses:', refKeyPoses)

  // Match key poses by type and calculate individual offsets
  const poseTypes = [
    KeyPoseType.PREPARATION,
    KeyPoseType.BACKSWING_PEAK,
    KeyPoseType.BALL_CONTACT,
    KeyPoseType.FOLLOW_THROUGH,
    KeyPoseType.FINISH
  ]

  const offsets: { type: KeyPoseType; offset: number; weight: number }[] = []

  for (const poseType of poseTypes) {
    const userPose = userKeyPoses.find(p => p.type === poseType)
    const refPose = refKeyPoses.find(p => p.type === poseType)

    if (userPose && refPose) {
      // Weight ball contact more heavily as it's the most important moment
      const weight = poseType === KeyPoseType.BALL_CONTACT ? 3.0 : 1.0

      offsets.push({
        type: poseType,
        offset: userPose.timestamp - refPose.timestamp,
        weight: weight
      })
    }
  }

  if (offsets.length === 0) {
    console.log('No key poses matched, using 0 offset')
    return 0
  }

  // Calculate weighted average offset
  const totalWeight = offsets.reduce((sum, o) => sum + o.weight, 0)
  const weightedSum = offsets.reduce((sum, o) => sum + (o.offset * o.weight), 0)
  const optimalOffset = weightedSum / totalWeight

  console.log('Individual offsets:', offsets)
  console.log('Optimal weighted offset:', optimalOffset, 'ms')

  return optimalOffset
}
