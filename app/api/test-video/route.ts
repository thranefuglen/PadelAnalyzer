import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

const TEST_VIDEO_PATH = path.join(process.cwd(), 'PadelVideos', 'Bad Slice.mp4')

export async function GET(request: NextRequest) {
  try {
    // Read the video file
    const videoBuffer = await fs.readFile(TEST_VIDEO_PATH)

    // Return video with proper headers
    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoBuffer.length.toString(),
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Error serving test video:', error)
    return NextResponse.json(
      { error: 'Failed to load test video' },
      { status: 500 }
    )
  }
}
