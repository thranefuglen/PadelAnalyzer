import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const REFERENCE_VIDEO_PATH = path.join(process.cwd(), 'PadelVideos', 'Good slice.mp4');

export async function GET(request: NextRequest) {
  try {
    const stat = fs.statSync(REFERENCE_VIDEO_PATH);
    const fileSize = stat.size;
    const range = request.headers.get('range');

    if (range) {
      // Parse Range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      // Read the specific chunk
      const file = fs.createReadStream(REFERENCE_VIDEO_PATH, { start, end });
      const chunks: Buffer[] = [];

      for await (const chunk of file) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': 'video/mp4',
          'Cache-Control': 'public, max-age=0',
        },
      });
    } else {
      // No range requested, send entire file
      const videoBuffer = fs.readFileSync(REFERENCE_VIDEO_PATH);

      return new NextResponse(videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=0',
        },
      });
    }
  } catch (error) {
    console.error('Error serving reference video:', error);
    return NextResponse.json(
      { error: 'Failed to load reference video' },
      { status: 500 }
    );
  }
}
