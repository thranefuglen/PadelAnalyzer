'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PoseFrame, POSE_CONNECTIONS } from '@/lib/pose-data'

interface PoseVisualizationProps {
  poseData: PoseFrame[]
  videoPath?: string
}

export default function PoseVisualization({ poseData, videoPath }: PoseVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const animationRef = useRef<number>()
  const lastTimeRef = useRef<number>(0)

  const drawPose = (frameIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas || !poseData[frameIndex]) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, width, height)

    const frame = poseData[frameIndex]
    const keypoints = frame.keypoints

    // Draw connections (bones)
    ctx.strokeStyle = '#00ff88'
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
      const isImportant = [11, 12, 13, 14, 15, 16, 23, 24].includes(i) // shoulders, elbows, wrists, hips

      ctx.beginPath()
      ctx.arc(x, y, isImportant ? 6 : 4, 0, 2 * Math.PI)
      ctx.fillStyle = isImportant ? '#ff0088' : '#00ff88'
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
  }

  // Sync video with current frame
  useEffect(() => {
    if (videoRef.current && videoLoaded && poseData[currentFrame]) {
      const targetTime = poseData[currentFrame].timestamp / 1000 // Convert to seconds
      if (Math.abs(videoRef.current.currentTime - targetTime) > 0.05) {
        videoRef.current.currentTime = targetTime
      }
    }
  }, [currentFrame, videoLoaded, poseData])

  const animate = (timestamp: number) => {
    if (!isPlaying) return

    if (timestamp - lastTimeRef.current > 33) { // ~30 fps
      setCurrentFrame((prev) => {
        const next = prev + 1
        if (next >= poseData.length) {
          setIsPlaying(false)
          if (videoRef.current) {
            videoRef.current.pause()
          }
          return 0
        }
        return next
      })
      lastTimeRef.current = timestamp
    }

    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now()
      animationRef.current = requestAnimationFrame(animate)
      if (videoRef.current) {
        videoRef.current.play()
      }
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying])

  useEffect(() => {
    drawPose(currentFrame)
  }, [currentFrame, poseData])

  useEffect(() => {
    // Load video
    if (videoRef.current) {
      const video = videoRef.current
      video.src = '/api/test-video'

      video.onloadedmetadata = () => {
        setVideoLoaded(true)
      }

      video.onerror = (e) => {
        console.error('Video load error:', e)
        setVideoLoaded(false)
      }

      // Force browser to start loading
      video.load()
    }
  }, [])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentFrame(0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pose Visualization</CardTitle>
        <CardDescription>
          Original video with synchronized stick figure overlay showing detected body keypoints
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original Video */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
              Original Video
            </div>
            <video
              ref={videoRef}
              className="w-full h-auto"
              muted
              playsInline
              preload="metadata"
            />
          </div>

          {/* Stick Figure Visualization */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
              Pose Detection
            </div>
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="w-full h-auto"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handlePlayPause} variant="default" disabled={!videoLoaded}>
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button onClick={handleReset} variant="outline" disabled={!videoLoaded}>
            Reset
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Timeline</label>
          <input
            type="range"
            min="0"
            max={poseData.length - 1}
            value={currentFrame}
            onChange={(e) => {
              setIsPlaying(false)
              setCurrentFrame(parseInt(e.target.value))
            }}
            className="w-full"
            disabled={!videoLoaded}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Frame: {currentFrame + 1}/{poseData.length}</span>
            <span>Time: {Math.round(poseData[currentFrame]?.timestamp || 0)}ms</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Green lines: Body connections (bones)</p>
          <p>• Pink dots: Key joints (shoulders, elbows, wrists, hips)</p>
          <p>• Green dots: Other tracked points</p>
          <p>• Video and stick figure are synchronized</p>
        </div>
      </CardContent>
    </Card>
  )
}
