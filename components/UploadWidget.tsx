'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
// Video compression temporarily disabled

export default function UploadWidget() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [originalSize, setOriginalSize] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setOriginalSize(selectedFile.size)
      setUploadId(null)
      setError(null)

      // Check if file needs compression
      const fileSizeMB = selectedFile.size / (1024 * 1024)
      if (fileSizeMB > 10) {
        // File is too large - show error for now
        setError(`File is ${fileSizeMB.toFixed(1)}MB. Please use a file smaller than 10MB. Video compression is temporarily unavailable.`)
        return
      } else {
        setFile(selectedFile)
      }
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

      const responseText = await response.text()
      let data
      try {
        data = JSON.parse(responseText)
      } catch (jsonError) {
        throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 100)}`)
      }

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
          Upload a padel video (shot from behind) for analysis. Max 10MB file size.
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
            disabled={isUploading || isAnalyzing || isCompressing}
          >
            {isCompressing ? 'Compressing...' : file ? file.name : 'Choose Video File'}
          </Button>
        </div>

        {file && (
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Size: {Math.round(file.size / 1024 / 1024 * 100) / 100} MB</div>
            {originalSize && originalSize !== file.size && (
              <div className="text-green-600">
                Compressed from {Math.round(originalSize / 1024 / 1024 * 100) / 100} MB
                ({Math.round((1 - file.size / originalSize) * 100)}% smaller)
              </div>
            )}
          </div>
        )}

        {isCompressing && (
          <div className="space-y-2">
            <Progress value={compressionProgress} />
            <p className="text-sm text-muted-foreground text-center">
              Compressing video... {Math.round(compressionProgress)}%
            </p>
          </div>
        )}

        {file && !uploadId && !isCompressing && (
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