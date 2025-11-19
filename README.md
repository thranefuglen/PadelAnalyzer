# PadelForm MVP

A minimal web application for analyzing padel video technique using AI-powered pose detection. Upload a video shot from behind and get detailed metrics on your form and movement.

## Features

- **Mobile-first responsive design** - Works seamlessly on mobile and desktop
- **Video upload** - Support for MP4, MOV, and AVI files up to 10MB
- **AI-powered analysis** - Uses MediaPipe Pose detection with intelligent fallback
- **Real-time metrics** - Elbow angle, shoulder rotation, movement tempo, and impact detection
- **Visual charts** - Interactive movement analysis with Recharts
- **No authentication** - Simple, straightforward upload and analyze workflow
- **File system storage** - All data stored locally, no database required

## Quick Start

### Prerequisites

1. **Node.js** (version 18 or higher)
2. **ffmpeg** - Required for video processing and thumbnails
3. **Python 3** - For video analysis
4. **(Optional) MediaPipe** - For better analysis quality

### Installation

1. **Clone the repository and install dependencies:**
   ```bash
   git clone https://github.com/thranefuglen/PadelAnalyzer.git
   cd PadelAnalyzer
   npm install
   ```

2. **Install ffmpeg:**

   **Windows:**
   ```bash
   # Using Chocolatey
   choco install ffmpeg

   # Or download from https://ffmpeg.org/download.html
   ```

   **macOS:**
   ```bash
   brew install ffmpeg
   ```

   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install ffmpeg
   ```

3. **(Optional) Install Python dependencies for better analysis:**

   **Windows:**
   ```bash
   py -m pip install mediapipe opencv-python numpy
   ```

   **macOS/Linux:**
   ```bash
   pip install mediapipe opencv-python numpy
   ```

   > **Note:** Python dependencies are completely optional. If not installed, the system automatically uses a fallback analysis with synthetic data that still demonstrates the application's functionality.

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Usage

1. **Upload:** Select a padel video file (shot from behind works best)
2. **Analyze:** Click "Analyze Video" and wait for processing (30-60 seconds)
3. **Review:** View detailed metrics, charts, and insights about your technique

### Supported Video Formats

- MP4 (recommended)
- MOV (QuickTime)
- AVI
- Maximum file size: 10MB (Vercel demo limitation)

## Architecture

```
├── app/                    # Next.js app router pages and API routes
│   ├── api/               # REST API endpoints
│   ├── analyses/[id]/     # Analysis results page
│   └── page.tsx          # Landing page
├── components/           # Reusable UI components
├── lib/                 # Core utilities
│   ├── analyzer.ts      # Python script wrapper
│   ├── ffmpeg.ts        # Video processing utilities
│   ├── fs-storage.ts    # File system operations
│   ├── pose-detector.ts # MediaPipe pose detection
│   ├── pose-data.ts     # Pose data structures and types
│   ├── movement-sync.ts # Movement synchronization logic
│   ├── vercel-storage.ts # Vercel storage integration
│   └── utils.ts         # General utilities
├── server/python/       # Python analysis script
└── storage/            # Local file storage
    ├── uploads/        # Uploaded videos
    └── results/        # Analysis results and thumbnails
```

## Analysis Metrics

The system analyzes the following aspects of your padel technique:

- **Stroke Type**: Forehand/backhand detection with confidence score
- **Elbow Angle**: Maximum extension angle during swing
- **Shoulder Rotation**: Rotational movement proxy
- **Movement Tempo**: Intensity of movement over time
- **Impact Points**: Key moments in the swing motion

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **UI**: Custom components based on shadcn/ui patterns
- **Charts**: Recharts for data visualization
- **Analysis**: Python script with MediaPipe Pose
- **Storage**: Local file system (easy to migrate to cloud later)

### API Endpoints

- `POST /api/upload` - Upload video file
- `POST /api/analyze` - Start analysis process
- `GET /api/analyses/[id]` - Get analysis results
- `GET /storage/results/[filename]` - Serve static thumbnail files

## Production Deployment

For production deployment:

1. Ensure ffmpeg and Python are available on the server
2. Set appropriate file upload limits in your server configuration
3. Configure proper file permissions for the `storage/` directory
4. Consider implementing rate limiting for the analysis endpoints

## Upgrading to Async Processing

The current implementation processes videos synchronously (blocking). To upgrade to async processing:

1. Replace the synchronous `analyzeVideo()` call with a job queue (Redis + Bull)
2. Add a status endpoint for polling analysis progress
3. Implement WebSocket connections for real-time updates
4. Add background worker processes

## Troubleshooting

### Common Issues

**"ffmpeg not found" error:**
- Ensure ffmpeg is installed and available in your system PATH
- Test with `ffmpeg -version` in terminal

**"Python analysis failed" error:**
- The system will automatically fall back to synthetic analysis
- For better results, install MediaPipe:
  - Windows: `py -m pip install mediapipe opencv-python numpy`
  - macOS/Linux: `pip install mediapipe opencv-python numpy`

**"File upload fails" error:**
- Check file size (max 10MB)
- Verify file format (MP4, MOV, AVI)
- Ensure `storage/uploads` directory exists and is writable (created automatically on first run)

### File Permissions

Make sure the storage directories are writable:
```bash
chmod 755 storage/
chmod 755 storage/uploads/
chmod 755 storage/results/
```

## Contributing

This is a minimal MVP designed for easy extension. Areas for improvement:

- Async processing with job queues
- Database integration
- User authentication
- Advanced pose analysis
- Video trimming and preprocessing
- Batch analysis capabilities

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### Third-Party Licenses

This project uses open-source libraries with permissive licenses that allow commercial use:
- MIT License: Next.js, React, Tailwind CSS, Recharts, FFmpeg.wasm, and others
- Apache 2.0: MediaPipe Tasks Vision

All third-party licenses and copyright notices are documented in [LICENSES.md](LICENSES.md).

**Commercial Use:** All dependencies permit commercial use without restrictions. You are free to use this software for commercial purposes while complying with the attribution requirements outlined in the license files.

## AI Agent Guidance

If you are using AI coding assistants (Copilot / others), see `.github/AGENTS.md` for:
- Architecture & data flow summary (frontend ↔ API ↔ Python pipeline)
- Metric conventions (`elbowAngleMax`, `shoulderRotationProxy`, `tempoSeries`, `impactFrames`)
- Storage abstraction differences (`fs-storage` vs `vercel-storage`)
- Safe extension guidelines (backwards-compatible metric additions)

When adding new metrics, update both the Python output (`server/python/analyze.py`) and TypeScript `AnalysisResult` structure, keeping existing fields stable. Heavy computation should live in Python or future workers, not API route handlers.