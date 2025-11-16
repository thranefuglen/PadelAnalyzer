import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const REFERENCE_VIDEO_PATH = path.join(process.cwd(), 'PadelVideos', 'Good slice.mp4');

export async function GET() {
  try {
    const videoBuffer = await fs.readFile(REFERENCE_VIDEO_PATH);

    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoBuffer.length.toString(),
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error serving reference video:', error);
    return NextResponse.json(
      { error: 'Failed to load reference video' },
      { status: 500 }
    );
  }
}
