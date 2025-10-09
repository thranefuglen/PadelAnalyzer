import UploadWidget from '@/components/UploadWidget'
import ReferenceAnalysisButton from '@/components/ReferenceAnalysisButton'

export default function Home() {
  return (
    <div className="min-h-screen py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          PadelForm MVP
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Analyze your padel technique with AI-powered pose detection.
          <br />
          <span className="text-sm text-muted-foreground mt-2 block">Test mode - using demo video from PadelVideos folder</span>
        </p>
      </div>

      <div className="max-w-2xl mx-auto mb-6">
        <ReferenceAnalysisButton />
      </div>

      <UploadWidget />

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div>
            <h3 className="font-semibold mb-1 text-foreground">1. Load</h3>
            <p>Load test video (Bad Slice.mp4)</p>
          </div>
          <div>
            <h3 className="font-semibold mb-1 text-foreground">2. Analyze</h3>
            <p>AI processes movement and technique</p>
          </div>
          <div>
            <h3 className="font-semibold mb-1 text-foreground">3. Review</h3>
            <p>Get detailed metrics and insights</p>
          </div>
        </div>
      </div>
    </div>
  )
}