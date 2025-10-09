'use client'

import { useState } from 'react'

export default function ReferenceAnalysisButton() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [hasReference, setHasReference] = useState(false)

  const checkReferenceExists = async () => {
    try {
      const response = await fetch('/api/analyze-reference')
      setHasReference(response.ok)
    } catch {
      setHasReference(false)
    }
  }

  useState(() => {
    checkReferenceExists()
  })

  const analyzeReference = async () => {
    try {
      setIsAnalyzing(true)
      setStatus('Loading MediaPipe...')

      // Import MediaPipe
      const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')

      setStatus('Initializing pose detection...')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )

      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1
      })

      setStatus('Loading video...')
      const video = document.createElement('video')
      video.src = '/api/reference-video'
      video.crossOrigin = 'anonymous'

      await new Promise((resolve) => {
        video.onloadedmetadata = resolve
      })

      const fps = 30
      const frameInterval = 1 / fps
      const poseData = []

      setStatus('Analyzing poses...')

      for (let time = 0; time < video.duration; time += frameInterval) {
        video.currentTime = time
        await new Promise(resolve => {
          video.onseeked = resolve
        })

        const timestamp = Math.floor(time * 1000)
        const result = poseLandmarker.detectForVideo(video, timestamp)

        if (result.landmarks && result.landmarks.length > 0) {
          const landmarks = result.landmarks[0]

          poseData.push({
            timestamp,
            keypoints: landmarks.map(lm => ({
              x: lm.x,
              y: lm.y,
              visibility: lm.visibility || 0
            }))
          })
        }
      }

      poseLandmarker.close()

      setStatus('Saving reference data...')
      const saveResponse = await fetch('/api/analyze-reference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poseData, fps })
      })

      if (!saveResponse.ok) {
        throw new Error('Failed to save reference data')
      }

      const result = await saveResponse.json()
      setStatus(`✓ Reference saved! Analyzed ${poseData.length} frames`)
      setHasReference(true)

      setTimeout(() => setStatus(''), 3000)

    } catch (error) {
      console.error('Reference analysis error:', error)
      setStatus('✗ Failed to analyze reference')
      setTimeout(() => setStatus(''), 3000)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-card rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <button
          onClick={analyzeReference}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {isAnalyzing ? 'Analyzing...' : hasReference ? 'Re-analyze Reference' : 'Analyze Reference Video'}
        </button>
        {hasReference && !isAnalyzing && (
          <span className="text-sm text-green-400 font-medium">✓ Reference Ready</span>
        )}
      </div>
      {status && (
        <p className="text-sm text-muted-foreground">{status}</p>
      )}
      <p className="text-xs text-muted-foreground text-center max-w-md">
        Analyze the professional reference video (Good Slice.mp4) once. This will be used to compare with user uploads.
      </p>
    </div>
  )
}
