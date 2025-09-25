'use client'

import { AnalysisResult } from '@/lib/vercel-storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AnalysisSummaryProps {
  result: AnalysisResult
}

export default function AnalysisSummary({ result }: AnalysisSummaryProps) {
  const getStrokeVariant = (strokeGuess: string) => {
    switch (strokeGuess) {
      case 'forehand':
        return 'default'
      case 'backhand':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600'
    if (confidence >= 0.4) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Analysis Summary</CardTitle>
        <CardDescription>
          Key metrics from your padel swing analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stroke Type */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Stroke Type</div>
            <Badge variant={getStrokeVariant(result.summary.strokeGuess)} className="mb-1">
              {result.summary.strokeGuess.charAt(0).toUpperCase() + result.summary.strokeGuess.slice(1)}
            </Badge>
            <div className={`text-sm ${getConfidenceColor(result.summary.confidence)}`}>
              {Math.round(result.summary.confidence * 100)}% confidence
            </div>
          </div>

          {/* Elbow Angle */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Max Elbow Angle</div>
            <div className="text-2xl font-bold text-primary">
              {result.metrics.elbowAngleMax}°
            </div>
            <div className="text-sm text-muted-foreground">
              {result.metrics.elbowAngleMax > 150 ? 'Good extension' : 'Consider more extension'}
            </div>
          </div>

          {/* Shoulder Rotation */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Shoulder Rotation</div>
            <div className="text-2xl font-bold text-primary">
              {result.metrics.shoulderRotationProxy.toFixed(1)}°
            </div>
            <div className="text-sm text-muted-foreground">
              {Math.abs(result.metrics.shoulderRotationProxy) > 10 ? 'Good rotation' : 'Limited rotation'}
            </div>
          </div>

          {/* Impact Points */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">Impact Points</div>
            <div className="text-2xl font-bold text-primary">
              {result.metrics.impactFrames.length}
            </div>
            <div className="text-sm text-muted-foreground">
              Key movement moments
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
            <div>
              <span className="font-medium">FPS:</span> {result.meta.fps}
            </div>
            <div>
              <span className="font-medium">Sample Rate:</span> {result.meta.sampleMs}ms
            </div>
            <div>
              <span className="font-medium">Frames Analyzed:</span> {result.meta.framesUsed}
            </div>
            <div>
              <span className="font-medium">Analysis Type:</span> {result.meta.fallback ? 'Fallback' : 'MediaPipe'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}