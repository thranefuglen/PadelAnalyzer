'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PoseFrame, POSE_CONNECTIONS } from '@/lib/pose-data'
import { calculateTimeOffset, detectKeyPoses, KeyPoseType } from '@/lib/movement-sync'

interface ComparisonVisualizationProps {
  userPoseData: PoseFrame[]
  referencePoseData: PoseFrame[]
  userVideoPath?: string
  referenceVideoPath: string
}

export default function ComparisonVisualization({
  userPoseData,
  referencePoseData,
  userVideoPath,
  referenceVideoPath
}: ComparisonVisualizationProps) {
  const userCanvasRef = useRef<HTMLCanvasElement>(null)
  const refCanvasRef = useRef<HTMLCanvasElement>(null)
  const userVideoRef = useRef<HTMLVideoElement>(null)
  const refVideoRef = useRef<HTMLVideoElement>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videosLoaded, setVideosLoaded] = useState({ user: false, ref: false })
  const [syncMode, setSyncMode] = useState<'movement' | 'time'>('movement')
  const [manualOffset, setManualOffset] = useState(0)
  const [layout, setLayout] = useState<'horizontal' | 'vertical' | 'overlay' | 'video-overlay'>('horizontal')
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const lastFrameTimeRef = useRef<number>(0)
  const userVideoStartTimeRef = useRef<number>(0)

  // Calculate automatic time offset for movement sync (in milliseconds)
  const autoTimeOffset = useMemo(() => {
    if (syncMode === 'movement') {
      const offset = calculateTimeOffset(userPoseData, referencePoseData)
      return offset
    }
    return 0
  }, [userPoseData, referencePoseData, syncMode])

  // Combined offset: automatic + manual adjustment
  const totalOffset = autoTimeOffset + manualOffset

  // Detect key poses for visualization
  const userKeyPoses = useMemo(() => detectKeyPoses(userPoseData), [userPoseData])
  const refKeyPoses = useMemo(() => detectKeyPoses(referencePoseData), [referencePoseData])

  // Calculate video durations from pose data
  const userDuration = userPoseData.length > 0 ? userPoseData[userPoseData.length - 1].timestamp : 0
  const refDuration = referencePoseData.length > 0 ? referencePoseData[referencePoseData.length - 1].timestamp : 0

  // Get current frame index from time
  const getCurrentUserFrame = (time: number): number => {
    const frame = userPoseData.findIndex(f => f.timestamp >= time)
    return frame >= 0 ? frame : userPoseData.length - 1
  }

  const getCurrentRefFrame = (time: number): number => {
    // Apply offset to get reference time
    const refTime = syncMode === 'movement' ? time - totalOffset : time
    const frame = referencePoseData.findIndex(f => f.timestamp >= refTime)
    return frame >= 0 ? frame : referencePoseData.length - 1
  }

  const drawPose = (
    canvas: HTMLCanvasElement,
    frameIndex: number,
    poseData: PoseFrame[],
    color: string,
    accentColor: string,
    keyPoses: any[] = [],
    isUserPose: boolean = true
  ) => {
    if (!canvas || !poseData[frameIndex]) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, width, height)

    // Check if current frame is a key pose
    const isKeyPose = keyPoses.some(kp => kp.frameIndex === frameIndex)

    const frame = poseData[frameIndex]
    const keypoints = frame.keypoints

    // Draw connections (bones)
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const start = keypoints[startIdx]
      const end = keypoints[endIdx]

      if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(start.x * width, start.y * height)
        ctx.lineTo(end.x * width, end.y * height)
        ctx.stroke()
      }
    }

    // Draw keypoints (joints)
    for (let i = 0; i < keypoints.length; i++) {
      const kp = keypoints[i]
      if (!kp || kp.visibility < 0.5) continue

      const x = kp.x * width
      const y = kp.y * height

      // Highlight important joints
      const isImportant = [11, 12, 13, 14, 15, 16, 23, 24].includes(i)

      ctx.beginPath()
      ctx.arc(x, y, isImportant ? 6 : 4, 0, 2 * Math.PI)
      ctx.fillStyle = isImportant ? accentColor : color
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Draw frame info
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px monospace'
    ctx.fillText(`Frame: ${frameIndex + 1}/${poseData.length}`, 10, 20)
    ctx.fillText(`Time: ${Math.round(frame.timestamp)}ms`, 10, 40)

    // Highlight key pose
    if (isKeyPose) {
      const keyPose = keyPoses.find(kp => kp.frameIndex === frameIndex)
      if (keyPose) {
        ctx.fillStyle = '#FFD700'
        ctx.font = 'bold 12px monospace'
        const label = keyPose.type.replace('_', ' ').toUpperCase()
        ctx.fillText(`★ ${label}`, 10, 60)
      }
    }
  }

  const drawVideoOverlayPose = (
    canvas: HTMLCanvasElement,
    userFrameIndex: number,
    refFrameIndex: number
  ) => {
    if (!canvas || !userPoseData[userFrameIndex] || !referencePoseData[refFrameIndex]) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas with transparency
    ctx.clearRect(0, 0, width, height)

    // Get frames and keypoints
    const refFrame = referencePoseData[refFrameIndex]
    const refKeypoints = refFrame.keypoints
    const userFrame = userPoseData[userFrameIndex]
    const userKeypoints = userFrame.keypoints

    // Calculate offset between right shoulders (index 12)
    const RIGHT_SHOULDER_INDEX = 12
    let offsetX = 0
    let offsetY = 0

    if (refKeypoints[RIGHT_SHOULDER_INDEX]?.visibility > 0.5 &&
        userKeypoints[RIGHT_SHOULDER_INDEX]?.visibility > 0.5) {
      const refShoulder = refKeypoints[RIGHT_SHOULDER_INDEX]
      const userShoulder = userKeypoints[RIGHT_SHOULDER_INDEX]

      // Calculate offset in pixel coordinates
      offsetX = (refShoulder.x - userShoulder.x) * width
      offsetY = (refShoulder.y - userShoulder.y) * height
    }

    // Draw reference pose first (green/teal - background)
    ctx.globalAlpha = 0.7
    ctx.strokeStyle = '#4ecdc4'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'

    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const start = refKeypoints[startIdx]
      const end = refKeypoints[endIdx]

      if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(start.x * width, start.y * height)
        ctx.lineTo(end.x * width, end.y * height)
        ctx.stroke()
      }
    }

    // Draw reference keypoints
    for (let i = 0; i < refKeypoints.length; i++) {
      const kp = refKeypoints[i]
      if (!kp || kp.visibility < 0.5) continue

      const x = kp.x * width
      const y = kp.y * height

      const isImportant = [11, 12, 13, 14, 15, 16, 23, 24].includes(i)

      ctx.beginPath()
      ctx.arc(x, y, isImportant ? 7 : 5, 0, 2 * Math.PI)
      ctx.fillStyle = isImportant ? '#00ff88' : '#4ecdc4'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Save canvas state before translation
    ctx.save()

    // Apply translation to align user pose with reference pose
    ctx.translate(offsetX, offsetY)

    // Draw user pose on top (red - foreground) with translation
    ctx.globalAlpha = 0.9
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 4
    ctx.lineCap = 'round'

    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const start = userKeypoints[startIdx]
      const end = userKeypoints[endIdx]

      if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(start.x * width, start.y * height)
        ctx.lineTo(end.x * width, end.y * height)
        ctx.stroke()
      }
    }

    // Draw user keypoints
    for (let i = 0; i < userKeypoints.length; i++) {
      const kp = userKeypoints[i]
      if (!kp || kp.visibility < 0.5) continue

      const x = kp.x * width
      const y = kp.y * height

      const isImportant = [11, 12, 13, 14, 15, 16, 23, 24].includes(i)

      ctx.beginPath()
      ctx.arc(x, y, isImportant ? 7 : 5, 0, 2 * Math.PI)
      ctx.fillStyle = isImportant ? '#ff0088' : '#ff6b6b'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Restore canvas state (remove translation)
    ctx.restore()

    // Reset alpha
    ctx.globalAlpha = 1.0
  }

  const drawOverlayPose = (
    canvas: HTMLCanvasElement,
    userFrameIndex: number,
    refFrameIndex: number
  ) => {
    if (!canvas || !userPoseData[userFrameIndex] || !referencePoseData[refFrameIndex]) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, width, height)

    // Get frames and keypoints
    const refFrame = referencePoseData[refFrameIndex]
    const refKeypoints = refFrame.keypoints
    const userFrame = userPoseData[userFrameIndex]
    const userKeypoints = userFrame.keypoints

    // Calculate offset between right shoulders (index 12)
    const RIGHT_SHOULDER_INDEX = 12
    let offsetX = 0
    let offsetY = 0

    if (refKeypoints[RIGHT_SHOULDER_INDEX]?.visibility > 0.5 &&
        userKeypoints[RIGHT_SHOULDER_INDEX]?.visibility > 0.5) {
      const refShoulder = refKeypoints[RIGHT_SHOULDER_INDEX]
      const userShoulder = userKeypoints[RIGHT_SHOULDER_INDEX]

      // Calculate offset in pixel coordinates
      offsetX = (refShoulder.x - userShoulder.x) * width
      offsetY = (refShoulder.y - userShoulder.y) * height
    }

    // Draw reference pose first (green/teal - background)
    // Draw reference connections with less opacity
    ctx.globalAlpha = 0.7
    ctx.strokeStyle = '#4ecdc4'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const start = refKeypoints[startIdx]
      const end = refKeypoints[endIdx]

      if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(start.x * width, start.y * height)
        ctx.lineTo(end.x * width, end.y * height)
        ctx.stroke()
      }
    }

    // Draw reference keypoints
    for (let i = 0; i < refKeypoints.length; i++) {
      const kp = refKeypoints[i]
      if (!kp || kp.visibility < 0.5) continue

      const x = kp.x * width
      const y = kp.y * height

      const isImportant = [11, 12, 13, 14, 15, 16, 23, 24].includes(i)

      ctx.beginPath()
      ctx.arc(x, y, isImportant ? 6 : 4, 0, 2 * Math.PI)
      ctx.fillStyle = isImportant ? '#00ff88' : '#4ecdc4'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Save canvas state before translation
    ctx.save()

    // Apply translation to align user pose with reference pose
    ctx.translate(offsetX, offsetY)

    // Draw user pose on top (red - foreground) with translation
    // Reset alpha and draw user connections
    ctx.globalAlpha = 0.85
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

    for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
      const start = userKeypoints[startIdx]
      const end = userKeypoints[endIdx]

      if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
        ctx.beginPath()
        ctx.moveTo(start.x * width, start.y * height)
        ctx.lineTo(end.x * width, end.y * height)
        ctx.stroke()
      }
    }

    // Draw user keypoints
    for (let i = 0; i < userKeypoints.length; i++) {
      const kp = userKeypoints[i]
      if (!kp || kp.visibility < 0.5) continue

      const x = kp.x * width
      const y = kp.y * height

      const isImportant = [11, 12, 13, 14, 15, 16, 23, 24].includes(i)

      ctx.beginPath()
      ctx.arc(x, y, isImportant ? 6 : 4, 0, 2 * Math.PI)
      ctx.fillStyle = isImportant ? '#ff0088' : '#ff6b6b'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Restore canvas state (remove translation)
    ctx.restore()

    // Reset alpha
    ctx.globalAlpha = 1.0

    // Draw frame info
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px monospace'
    ctx.fillText(`User Frame: ${userFrameIndex + 1}/${userPoseData.length}`, 10, 20)
    ctx.fillText(`Ref Frame: ${refFrameIndex + 1}/${referencePoseData.length}`, 10, 40)
    ctx.fillText(`Time: ${Math.round(userFrame.timestamp)}ms`, 10, 60)
    ctx.fillText(`Aligned by: Right Shoulder`, 10, 80)

    // Check for key poses
    const userIsKeyPose = userKeyPoses.some(kp => kp.frameIndex === userFrameIndex)
    const refIsKeyPose = refKeyPoses.some(kp => kp.frameIndex === refFrameIndex)

    let yOffset = 100
    if (userIsKeyPose) {
      const keyPose = userKeyPoses.find(kp => kp.frameIndex === userFrameIndex)
      if (keyPose) {
        ctx.fillStyle = '#ff6b6b'
        ctx.font = 'bold 12px monospace'
        const label = keyPose.type.replace('_', ' ').toUpperCase()
        ctx.fillText(`★ Your: ${label}`, 10, yOffset)
        yOffset += 20
      }
    }
    if (refIsKeyPose) {
      const keyPose = refKeyPoses.find(kp => kp.frameIndex === refFrameIndex)
      if (keyPose) {
        ctx.fillStyle = '#4ecdc4'
        ctx.font = 'bold 12px monospace'
        const label = keyPose.type.replace('_', ' ').toUpperCase()
        ctx.fillText(`★ Ref: ${label}`, 10, yOffset)
      }
    }
  }

  // Sync videos with current time when scrubbing
  useEffect(() => {
    if (!isPlaying) {
      if (userVideoRef.current && videosLoaded.user) {
        userVideoRef.current.currentTime = currentTime / 1000
      }
      if (refVideoRef.current && videosLoaded.ref) {
        const refTime = syncMode === 'movement' ? currentTime - totalOffset : currentTime
        if (refTime < 0) {
          // Reference hasn't started yet, show first frame
          refVideoRef.current.currentTime = 0
        } else {
          refVideoRef.current.currentTime = Math.min(refTime / 1000, refVideoRef.current.duration || 0)
        }
      }
    }
  }, [currentTime, isPlaying, videosLoaded, syncMode, totalOffset])

  const animate = (timestamp: number) => {
    if (!isPlaying) return

    const deltaTime = timestamp - lastFrameTimeRef.current

    if (deltaTime > 16) { // ~60fps
      setCurrentTime((prev) => {
        const next = prev + (deltaTime * playbackSpeed)
        if (next >= userDuration) {
          setIsPlaying(false)
          if (userVideoRef.current) userVideoRef.current.pause()
          if (refVideoRef.current) refVideoRef.current.pause()
          return 0
        }
        return next
      })
      lastFrameTimeRef.current = timestamp
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  // Control video playback based on offset
  useEffect(() => {
    if (isPlaying && refVideoRef.current && videosLoaded.ref && syncMode === 'movement') {
      const refTime = currentTime - totalOffset

      if (refTime < 0) {
        // Reference video should be paused (hasn't started yet)
        refVideoRef.current.pause()
        refVideoRef.current.currentTime = 0
      } else if (refTime > referencePoseData[referencePoseData.length - 1]?.timestamp || 0) {
        // Reference video has finished, pause at end
        refVideoRef.current.pause()
        if (refVideoRef.current.duration) {
          refVideoRef.current.currentTime = refVideoRef.current.duration
        }
      } else {
        // Reference video should be playing
        if (refVideoRef.current.paused) {
          refVideoRef.current.currentTime = refTime / 1000
          refVideoRef.current.play().catch(e => console.error('Ref video play error:', e))
        }
      }
    }
  }, [currentTime, isPlaying, videosLoaded.ref, syncMode, totalOffset, referencePoseData])

  useEffect(() => {
    if (isPlaying) {
      lastFrameTimeRef.current = performance.now()

      // Start user video
      if (userVideoRef.current) {
        userVideoRef.current.currentTime = currentTime / 1000
        userVideoRef.current.play().catch(e => console.error('User video play error:', e))
      }

      // Start reference video (if in range)
      if (refVideoRef.current) {
        const refTime = syncMode === 'movement' ? currentTime - totalOffset : currentTime
        if (refTime >= 0) {
          refVideoRef.current.currentTime = refTime / 1000
          refVideoRef.current.play().catch(e => console.error('Ref video play error:', e))
        } else {
          refVideoRef.current.pause()
          refVideoRef.current.currentTime = 0
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (userVideoRef.current) userVideoRef.current.pause()
      if (refVideoRef.current) refVideoRef.current.pause()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, syncMode, totalOffset])

  useEffect(() => {
    const userFrame = getCurrentUserFrame(currentTime)
    const refFrame = getCurrentRefFrame(currentTime)

    if (layout === 'overlay' && overlayCanvasRef.current) {
      drawOverlayPose(overlayCanvasRef.current, userFrame, refFrame)
    } else if (layout === 'video-overlay' && overlayCanvasRef.current) {
      drawVideoOverlayPose(overlayCanvasRef.current, userFrame, refFrame)
    } else {
      if (userCanvasRef.current) {
        drawPose(userCanvasRef.current, userFrame, userPoseData, '#ff6b6b', '#ff0088', userKeyPoses, true)
      }
      if (refCanvasRef.current) {
        drawPose(refCanvasRef.current, refFrame, referencePoseData, '#4ecdc4', '#00ff88', refKeyPoses, false)
      }
    }
  }, [currentTime, userPoseData, referencePoseData, syncMode, userKeyPoses, refKeyPoses, totalOffset, layout])

  useEffect(() => {
    // Load videos
    if (userVideoRef.current) {
      const userVideo = userVideoRef.current
      userVideo.src = '/api/test-video'

      userVideo.onloadedmetadata = () => {
        setVideosLoaded(prev => ({ ...prev, user: true }))
      }

      userVideo.onerror = (e) => {
        console.error('User video load error:', e)
        setVideosLoaded(prev => ({ ...prev, user: false }))
      }

      // Force browser to start loading
      userVideo.load()
    }

    if (refVideoRef.current) {
      const refVideo = refVideoRef.current
      refVideo.src = '/api/reference-video'

      refVideo.onloadedmetadata = () => {
        setVideosLoaded(prev => ({ ...prev, ref: true }))
      }

      refVideo.onerror = (e) => {
        console.error('Reference video load error:', e)
        setVideosLoaded(prev => ({ ...prev, ref: false }))
      }

      // Force browser to start loading
      refVideo.load()
    }
  }, [])

  // Update video playback rate when speed changes
  useEffect(() => {
    if (userVideoRef.current) {
      userVideoRef.current.playbackRate = playbackSpeed
    }
    if (refVideoRef.current) {
      refVideoRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Side-by-Side Comparison</CardTitle>
        <CardDescription>
          Compare your technique (red) with the professional reference (teal)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Videos - only show in horizontal/vertical layouts */}
        {layout !== 'overlay' && layout !== 'video-overlay' && (
          <div className={layout === 'horizontal' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-4'}>
            {/* User Video */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <div className="absolute top-2 left-2 bg-red-600/90 text-white text-xs px-2 py-1 rounded z-10 font-medium">
                Your Shot
              </div>
              <video
                ref={userVideoRef}
                className="w-full h-auto"
                muted
                playsInline
                preload="metadata"
              />
            </div>

            {/* Reference Video */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <div className="absolute top-2 left-2 bg-teal-600/90 text-white text-xs px-2 py-1 rounded z-10 font-medium">
                Professional Reference
              </div>
              <video
                ref={refVideoRef}
                className="w-full h-auto"
                muted
                playsInline
                preload="metadata"
              />
            </div>
          </div>
        )}

        {/* Pose Visualizations */}
        {layout === 'video-overlay' ? (
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <div className="absolute top-2 left-2 bg-purple-600/90 text-white text-xs px-2 py-1 rounded z-10 font-medium">
              Video + Pose Overlay
            </div>
            <div className="relative">
              <video
                ref={userVideoRef}
                className="w-full h-auto"
                muted
                playsInline
                preload="metadata"
              />
              <canvas
                ref={overlayCanvasRef}
                width={640}
                height={480}
                className="absolute top-0 left-0 w-full h-auto pointer-events-none"
                style={{ mixBlendMode: 'normal' }}
              />
            </div>
          </div>
        ) : layout === 'overlay' ? (
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <div className="absolute top-2 left-2 bg-purple-600/90 text-white text-xs px-2 py-1 rounded z-10 font-medium">
              Overlay: Teal (Reference) + Red (Your Pose)
            </div>
            <canvas
              ref={overlayCanvasRef}
              width={640}
              height={480}
              className="w-full h-auto"
            />
          </div>
        ) : (
          <div className={layout === 'horizontal' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-4'}>
            {/* User Pose */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <div className="absolute top-2 left-2 bg-red-600/90 text-white text-xs px-2 py-1 rounded z-10 font-medium">
                Your Pose
              </div>
              <canvas
                ref={userCanvasRef}
                width={640}
                height={480}
                className="w-full h-auto"
              />
            </div>

            {/* Reference Pose */}
            <div className="relative bg-gray-900 rounded-lg overflow-hidden">
              <div className="absolute top-2 left-2 bg-teal-600/90 text-white text-xs px-2 py-1 rounded z-10 font-medium">
                Professional Pose
              </div>
              <canvas
                ref={refCanvasRef}
                width={640}
                height={480}
                className="w-full h-auto"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handlePlayPause} variant="default" disabled={!videosLoaded.user || !videosLoaded.ref}>
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button onClick={handleReset} variant="outline" disabled={!videosLoaded.user || !videosLoaded.ref}>
            Reset
          </Button>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm font-medium">Speed:</span>
            <Button
              onClick={() => setPlaybackSpeed(0.25)}
              variant={playbackSpeed === 0.25 ? 'default' : 'outline'}
              size="sm"
            >
              0.25x
            </Button>
            <Button
              onClick={() => setPlaybackSpeed(0.5)}
              variant={playbackSpeed === 0.5 ? 'default' : 'outline'}
              size="sm"
            >
              0.5x
            </Button>
            <Button
              onClick={() => setPlaybackSpeed(0.75)}
              variant={playbackSpeed === 0.75 ? 'default' : 'outline'}
              size="sm"
            >
              0.75x
            </Button>
            <Button
              onClick={() => setPlaybackSpeed(1)}
              variant={playbackSpeed === 1 ? 'default' : 'outline'}
              size="sm"
            >
              1x
            </Button>
          </div>
          <div className="flex gap-2 items-center ml-auto flex-wrap">
            <span className="text-sm font-medium">Layout:</span>
            <Button
              onClick={() => setLayout('horizontal')}
              variant={layout === 'horizontal' ? 'default' : 'outline'}
              size="sm"
            >
              Side by Side
            </Button>
            <Button
              onClick={() => setLayout('vertical')}
              variant={layout === 'vertical' ? 'default' : 'outline'}
              size="sm"
            >
              Stacked
            </Button>
            <Button
              onClick={() => setLayout('overlay')}
              variant={layout === 'overlay' ? 'default' : 'outline'}
              size="sm"
            >
              Overlay
            </Button>
            <Button
              onClick={() => setLayout('video-overlay')}
              variant={layout === 'video-overlay' ? 'default' : 'outline'}
              size="sm"
            >
              Video Overlay
            </Button>
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-sm font-medium">Sync Mode:</span>
            <Button
              onClick={() => setSyncMode('movement')}
              variant={syncMode === 'movement' ? 'default' : 'outline'}
              size="sm"
            >
              Movement
            </Button>
            <Button
              onClick={() => setSyncMode('time')}
              variant={syncMode === 'time' ? 'default' : 'outline'}
              size="sm"
            >
              Time
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Timeline</label>
          <input
            type="range"
            min="0"
            max={userDuration}
            step="10"
            value={currentTime}
            onChange={(e) => {
              setIsPlaying(false)
              setCurrentTime(parseInt(e.target.value))
            }}
            className="w-full"
            disabled={!videosLoaded.user || !videosLoaded.ref}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Time: {(currentTime / 1000).toFixed(2)}s / {(userDuration / 1000).toFixed(2)}s</span>
          </div>
        </div>

        {syncMode === 'movement' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Sync Offset Adjustment</label>
              <Button
                onClick={() => setManualOffset(0)}
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
              >
                Reset
              </Button>
            </div>
            <input
              type="range"
              min="-2000"
              max="2000"
              step="50"
              value={manualOffset}
              onChange={(e) => {
                setManualOffset(parseInt(e.target.value))
              }}
              className="w-full"
              disabled={!videosLoaded.user || !videosLoaded.ref}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Auto: {(autoTimeOffset / 1000).toFixed(2)}s</span>
              <span>Manual: {(manualOffset / 1000).toFixed(2)}s</span>
              <span className="text-yellow-400 font-medium">Total: {(totalOffset / 1000).toFixed(2)}s</span>
            </div>
            <p className="text-xs text-muted-foreground">
              ← Reference earlier | Reference later →
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <span className="text-red-400">Red</span>: Your technique</p>
          <p>• <span className="text-teal-400">Teal</span>: Professional reference</p>
          <p>• <span className="text-yellow-400">★ Gold star</span>: Key poses detected (preparation, backswing, contact, follow-through)</p>
          <p>• <strong>Overlay mode</strong>: Both stickmen in the same view - teal (reference) as background, red (yours) layered on top for direct comparison</p>
          <p>• <strong>Movement sync</strong>: Aligns videos by technique phases for better comparison</p>
          <p>• <strong>Time sync</strong>: Aligns videos by elapsed time (original mode)</p>
        </div>
      </CardContent>
    </Card>
  )
}
