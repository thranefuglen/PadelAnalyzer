'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AnalysisResult } from '@/lib/vercel-storage'
import AnalysisSummary from '@/components/AnalysisSummary'
import AnalysisCharts from '@/components/AnalysisCharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface AnalysisResponse {
  status: 'processing' | 'completed' | 'failed'
  result?: AnalysisResult
  analysisId: string
  error?: string
}

export default function AnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const analysisId = params.id as string

  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!analysisId) return

    const fetchAnalysis = async () => {
      try {
        const response = await fetch(`/api/analyses/${analysisId}`)
        let data

        const responseText = await response.text()
        try {
          data = JSON.parse(responseText)
        } catch (jsonError) {
          throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 100)}`)
        }

        if (response.ok) {
          setAnalysis(data)

          // If still processing, poll again after delay
          if (data.status === 'processing') {
            setTimeout(fetchAnalysis, 3000)
          }
        } else {
          setError(data.error || 'Failed to fetch analysis')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analysis')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [analysisId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Progress value={30} />
              <p className="text-center text-muted-foreground">Loading analysis...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Upload New Video
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (analysis?.status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Processing Analysis</CardTitle>
            <CardDescription>
              Your video is being analyzed. This usually takes 30-60 seconds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={60} />
            <p className="text-sm text-muted-foreground text-center">
              Analyzing movement patterns...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (analysis?.status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Analysis Failed</CardTitle>
            <CardDescription>
              {analysis.error || 'Something went wrong during analysis.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analysis?.result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Results Found</CardTitle>
            <CardDescription>
              Analysis results not found for this ID.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Upload New Video
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Analysis Results
        </h1>
        <p className="text-gray-600">
          Analysis ID: <code className="text-sm bg-gray-100 px-2 py-1 rounded">{analysisId}</code>
        </p>
      </div>

      {/* Analysis Summary */}
      <AnalysisSummary result={analysis.result} />

      {/* Charts */}
      <AnalysisCharts result={analysis.result} />

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Analysis Complete</CardTitle>
          <CardDescription>
            Your padel video has been successfully analyzed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This analysis used {analysis.result.meta.fallback ? 'fallback processing' : 'MediaPipe pose detection'}
              to analyze {analysis.result.meta.framesUsed} frames of your video. The system detected key movement
              patterns and calculated metrics for your padel technique.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={() => router.push('/')} className="w-full sm:w-auto">
                Analyze Another Video
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}