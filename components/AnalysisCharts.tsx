'use client'

import { AnalysisResult } from '@/lib/vercel-storage'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

interface AnalysisChartsProps {
  result: AnalysisResult
}

export default function AnalysisCharts({ result }: AnalysisChartsProps) {
  // Prepare data for the chart
  const chartData = result.metrics.tempoSeries.map(([timestamp, tempo]) => ({
    time: (timestamp / 1000).toFixed(1), // Convert to seconds
    tempo: tempo,
    timeMs: timestamp
  }))

  // Custom tooltip formatter
  const formatTooltip = (value: any, name: string) => {
    if (name === 'tempo') {
      return [`${value.toFixed(1)}`, 'Movement Intensity']
    }
    return [value, name]
  }

  // Custom label formatter
  const formatLabel = (label: string) => {
    return `Time: ${label}s`
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Movement Analysis</CardTitle>
        <CardDescription>
          Movement intensity over time with key impact moments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="time"
                label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                label={{ value: 'Movement Intensity', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={formatTooltip}
                labelFormatter={formatLabel}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="tempo"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                name="Movement Intensity"
              />

              {/* Impact frames as vertical reference lines */}
              {result.metrics.impactFrames.map((impactTime, index) => (
                <ReferenceLine
                  key={index}
                  x={(impactTime / 1000).toFixed(1)}
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: `Impact ${index + 1}`, position: 'top' }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-primary"></div>
            <span>Movement intensity over time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500 border-dashed border-red-500" style={{borderTopWidth: '1px', borderTopStyle: 'dashed'}}></div>
            <span>Impact moments ({result.metrics.impactFrames.length} detected)</span>
          </div>
        </div>

        {/* Key Insights */}
        {chartData.length > 0 && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">Key Insights:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • Peak movement intensity: {Math.max(...chartData.map(d => d.tempo)).toFixed(1)}
                at {chartData.find(d => d.tempo === Math.max(...chartData.map(d => d.tempo)))?.time}s
              </li>
              <li>
                • Average movement intensity: {(chartData.reduce((sum, d) => sum + d.tempo, 0) / chartData.length).toFixed(1)}
              </li>
              {result.metrics.impactFrames.length > 0 && (
                <li>
                  • First impact detected at: {(result.metrics.impactFrames[0] / 1000).toFixed(1)}s
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}