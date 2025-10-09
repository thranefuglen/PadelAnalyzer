'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { detectPoseFromVideo } from '@/lib/pose-detector'

export default function UploadWidget() {
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const router = useRouter()

  const handleUseTestVideo = async () => {
    setIsUploading(true)
    setError(null)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      console.log('Upload response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load test video')
      }

      setUploadId(data.uploadId)
      console.log('Upload ID set to:', data.uploadId)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load test video')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!uploadId || !videoRef.current) return

    setIsAnalyzing(true)
    setAnalysisProgress(10)
    setError(null)

    try {
      // Load test video
      const videoElement = videoRef.current
      videoElement.src = '/api/test-video'

      await new Promise((resolve, reject) => {
        videoElement.onloadedmetadata = resolve
        videoElement.onerror = reject
      })

      setAnalysisProgress(30)

      // Run pose detection on the video
      console.log('Starting pose detection...')
      const poseResult = await detectPoseFromVideo(videoElement)
      console.log('Pose detection complete:', poseResult)

      setAnalysisProgress(70)

      // Send pose data to backend for analysis
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId,
          poseData: poseResult.poseData,
          fps: poseResult.fps
        }),
      })

      const responseText = await response.text()
      let data
      try {
        data = JSON.parse(responseText)
      } catch (jsonError) {
        throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 100)}`)
      }

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setAnalysisProgress(100)

      // Redirect to results page
      router.push(`/analyses/${data.analysisId}`)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setIsAnalyzing(false)
      setAnalysisProgress(0)
    }
  }

  return (
    <>
      <video ref={videoRef} className="hidden" crossOrigin="anonymous" />

      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Analyze Test Video</CardTitle>
          <CardDescription>
            Using test video: Single hit.mp4 (player in white outfit)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!uploadId && !isUploading && (
            <Button
              onClick={handleUseTestVideo}
              className="w-full"
            >
              Load Test Video
            </Button>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Progress value={75} />
              <p className="text-sm text-muted-foreground text-center">
                Loading test video...
              </p>
            </div>
          )}

          {uploadId && !isAnalyzing && (
            <Button
              onClick={handleAnalyze}
              className="w-full"
            >
              Analyze Video with Pose Detection
            </Button>
          )}

          {isAnalyzing && (
            <div className="space-y-2">
              <Progress value={analysisProgress} />
              <p className="text-sm text-muted-foreground text-center">
                {analysisProgress < 30 && 'Loading video...'}
                {analysisProgress >= 30 && analysisProgress < 70 && 'Running pose detection...'}
                {analysisProgress >= 70 && 'Finalizing analysis...'}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-md">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}