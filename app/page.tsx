import UploadWidget from '@/components/UploadWidget'

export default function Home() {
  return (
    <div className="min-h-screen py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          PadelForm MVP
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Analyze your padel technique with AI-powered pose detection.
          Upload a video shot from behind and get detailed metrics on your form.
        </p>
      </div>

      <UploadWidget />

      <div className="mt-12 text-center text-sm text-gray-500">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div>
            <h3 className="font-semibold mb-1">1. Upload</h3>
            <p>Choose a padel video file (MP4, MOV, AVI)</p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">2. Analyze</h3>
            <p>AI processes your movement and technique</p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">3. Review</h3>
            <p>Get detailed metrics and insights</p>
          </div>
        </div>
      </div>
    </div>
  )
}