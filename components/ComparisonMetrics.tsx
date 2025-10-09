'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ComparisonMetricsProps {
  userMetrics: {
    elbowAngleMax: number
    shoulderRotationProxy: number
    impactFrames: number[]
  }
  referenceMetrics: {
    elbowAngleMax: number
    shoulderRotationProxy: number
    impactFrames: number[]
  }
  comparison: {
    elbowAngleDiff: number
    shoulderRotationDiff: number
    referenceVideo: string
  }
}

export default function ComparisonMetrics({
  userMetrics,
  referenceMetrics,
  comparison
}: ComparisonMetricsProps) {
  const getComparisonColor = (diff: number, lowerIsBetter: boolean = false) => {
    const threshold = lowerIsBetter ? -10 : 10
    if (Math.abs(diff) < Math.abs(threshold) * 0.3) return 'text-green-600'
    if (Math.abs(diff) < Math.abs(threshold) * 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getComparisonText = (diff: number, metric: string) => {
    const absDiff = Math.abs(diff)
    if (absDiff < 5) return 'Nearly identical!'
    if (diff > 0) return `${absDiff.toFixed(1)}° more than pro`
    return `${absDiff.toFixed(1)}° less than pro`
  }

  const getShoulderRotationText = (diff: number) => {
    const absDiff = Math.abs(diff)
    if (absDiff < 5) return 'Nearly identical!'
    if (diff > 0) return `${absDiff.toFixed(1)} more rotation than pro`
    return `${absDiff.toFixed(1)} less rotation than pro`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison Analysis</CardTitle>
        <CardDescription>
          How your technique compares to {comparison.referenceVideo}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Elbow Angle Comparison */}
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-3 text-lg">Elbow Extension</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Your Max Angle</p>
                <p className="text-2xl font-bold text-red-600">
                  {userMetrics.elbowAngleMax.toFixed(1)}°
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Professional</p>
                <p className="text-2xl font-bold text-teal-600">
                  {referenceMetrics.elbowAngleMax.toFixed(1)}°
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className={`text-2xl font-bold ${getComparisonColor(comparison.elbowAngleDiff)}`}>
                  {comparison.elbowAngleDiff > 0 ? '+' : ''}
                  {comparison.elbowAngleDiff.toFixed(1)}°
                </p>
                <p className="text-xs text-muted-foreground">
                  {getComparisonText(comparison.elbowAngleDiff, 'elbow')}
                </p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Insight:</strong> {Math.abs(comparison.elbowAngleDiff) < 10
                  ? 'Your elbow extension is very similar to the professional. Good form!'
                  : comparison.elbowAngleDiff > 0
                    ? 'You extend your elbow more than the professional. This might indicate over-reaching or different technique.'
                    : 'Your elbow is less extended than the professional. Consider extending more for better reach and power.'}
              </p>
            </div>
          </div>

          {/* Shoulder Rotation Comparison */}
          <div className="border-b pb-4">
            <h3 className="font-semibold mb-3 text-lg">Shoulder Rotation</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Your Rotation</p>
                <p className="text-2xl font-bold text-red-600">
                  {userMetrics.shoulderRotationProxy.toFixed(1)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Professional</p>
                <p className="text-2xl font-bold text-teal-600">
                  {referenceMetrics.shoulderRotationProxy.toFixed(1)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Difference</p>
                <p className={`text-2xl font-bold ${getComparisonColor(comparison.shoulderRotationDiff)}`}>
                  {comparison.shoulderRotationDiff > 0 ? '+' : ''}
                  {comparison.shoulderRotationDiff.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getShoulderRotationText(comparison.shoulderRotationDiff)}
                </p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Insight:</strong> {Math.abs(comparison.shoulderRotationDiff) < 10
                  ? 'Your shoulder rotation matches the professional well!'
                  : comparison.shoulderRotationDiff > 0
                    ? 'You rotate your shoulders more than the professional. This could mean more torso involvement.'
                    : 'Your shoulder rotation is less than the professional. More rotation could generate more power.'}
              </p>
            </div>
          </div>

          {/* Impact Timing */}
          <div>
            <h3 className="font-semibold mb-3 text-lg">Impact Timing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Your Impacts Detected</p>
                <p className="text-2xl font-bold text-red-600">
                  {userMetrics.impactFrames.length}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Professional Impacts</p>
                <p className="text-2xl font-bold text-teal-600">
                  {referenceMetrics.impactFrames.length}
                </p>
              </div>
            </div>
          </div>

          {/* Overall Summary */}
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold mb-2 text-blue-900">Overall Assessment</h4>
            <p className="text-sm text-blue-800">
              {Math.abs(comparison.elbowAngleDiff) < 10 && Math.abs(comparison.shoulderRotationDiff) < 10
                ? '🎉 Excellent! Your technique is very close to the professional reference. Keep up the great work!'
                : Math.abs(comparison.elbowAngleDiff) < 20 && Math.abs(comparison.shoulderRotationDiff) < 20
                  ? '👍 Good form! You have some minor differences from the professional, but your overall technique is solid.'
                  : '💪 There are noticeable differences between your technique and the professional. Focus on the specific metrics above to improve your form.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
