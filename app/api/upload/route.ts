import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const TEST_VIDEO_PATH = path.join(process.cwd(), 'PadelVideos', 'Single hit.mp4');

export async function POST(request: NextRequest) {
  try {
    // Always use test video for now
    const uploadId = 'test-video-single-hit';

    // Verify test video exists
    try {
      await fs.access(TEST_VIDEO_PATH);
    } catch {
      return NextResponse.json(
        { error: 'Test video not found at PadelVideos/Single hit.mp4' },
        { status: 500 }
      );
    }

    const stats = await fs.stat(TEST_VIDEO_PATH);

    return NextResponse.json({
      uploadId,
      fileName: 'Single hit.mp4',
      fileSize: stats.size,
      message: 'Using test video from PadelVideos/Single hit.mp4'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to access test video' },
      { status: 500 }
    );
  }
}