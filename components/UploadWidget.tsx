'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export default function UploadWidget() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadId(null)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setUploadId(data.uploadId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!uploadId) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uploadId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      // Redirect to results page
      router.push(`/analyses/${data.analysisId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setIsAnalyzing(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Upload Padel Video</CardTitle>
        <CardDescription>
          Upload a padel video (shot from behind) for analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo"
            onChange={handleFileSelect}
            className="hidden"
            id="video-upload"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
            disabled={isUploading || isAnalyzing}
          >
            {file ? file.name : 'Choose Video File'}
          </Button>
        </div>

        {file && (
          <div className="text-sm text-muted-foreground">
            Size: {Math.round(file.size / 1024 / 1024 * 100) / 100} MB
          </div>
        )}

        {file && !uploadId && (
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : 'Upload Video'}
          </Button>
        )}

        {isUploading && (
          <div className="space-y-2">
            <Progress value={75} />
            <p className="text-sm text-muted-foreground text-center">
              Uploading video...
            </p>
          </div>
        )}

        {uploadId && !isAnalyzing && (
          <Button
            onClick={handleAnalyze}
            className="w-full"
          >
            Analyze Video
          </Button>
        )}

        {isAnalyzing && (
          <div className="space-y-2">
            <Progress value={50} />
            <p className="text-sm text-muted-foreground text-center">
              Analyzing video... This may take a moment.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}