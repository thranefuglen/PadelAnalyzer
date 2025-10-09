import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import type { PoseFrame } from '@/lib/pose-data';

const REFERENCE_VIDEO_PATH = path.join(process.cwd(), 'PadelVideos', 'Good Slice.mp4');
const REFERENCE_DATA_PATH = path.join(process.cwd(), 'data', 'reference-analysis.json');

export async function POST() {
  try {
    // Check if reference video exists
    await fs.access(REFERENCE_VIDEO_PATH);

    // Return the video path so the client can analyze it
    return NextResponse.json({
      message: 'Reference video ready for analysis',
      videoPath: '/api/reference-video'
    });

  } catch (error) {
    console.error('Error preparing reference video:', error);
    return NextResponse.json(
      { error: 'Failed to prepare reference video' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { poseData, fps } = await request.json();

    if (!poseData || !Array.isArray(poseData)) {
      return NextResponse.json(
        { error: 'Pose data is required' },
        { status: 400 }
      );
    }

    const frames = poseData as PoseFrame[];
    const metrics = calculateMetricsFromPose(frames);

    const referenceData = {
      videoName: 'Good Slice.mp4',
      analyzedAt: new Date().toISOString(),
      metrics,
      fps: fps || 30,
      frameCount: frames.length,
      poseData: frames
    };

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    // Save reference data
    await fs.writeFile(
      REFERENCE_DATA_PATH,
      JSON.stringify(referenceData, null, 2)
    );

    return NextResponse.json({
      message: 'Reference analysis saved successfully',
      metrics
    });

  } catch (error) {
    console.error('Error saving reference analysis:', error);
    return NextResponse.json(
      { error: 'Failed to save reference analysis' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const data = await fs.readFile(REFERENCE_DATA_PATH, 'utf-8');
    const referenceData = JSON.parse(data);

    return NextResponse.json(referenceData);
  } catch (error) {
    return NextResponse.json(
      { error: 'No reference data found. Please analyze the reference video first.' },
      { status: 404 }
    );
  }
}

function calculateMetricsFromPose(frames: PoseFrame[]) {
  let maxElbowAngle = 0;

  for (const frame of frames) {
    const shoulder = frame.keypoints[12];
    const elbow = frame.keypoints[14];
    const wrist = frame.keypoints[16];

    if (shoulder && elbow && wrist &&
        shoulder.visibility > 0.5 && elbow.visibility > 0.5 && wrist.visibility > 0.5) {
      const angle = calculateAngle(shoulder, elbow, wrist);
      maxElbowAngle = Math.max(maxElbowAngle, angle);
    }
  }

  const shoulderRotations: number[] = [];
  for (const frame of frames) {
    const leftShoulder = frame.keypoints[11];
    const rightShoulder = frame.keypoints[12];

    if (leftShoulder && rightShoulder &&
        leftShoulder.visibility > 0.5 && rightShoulder.visibility > 0.5) {
      const dist = Math.sqrt(
        Math.pow(rightShoulder.x - leftShoulder.x, 2) +
        Math.pow(rightShoulder.y - leftShoulder.y, 2)
      );
      shoulderRotations.push(dist);
    }
  }

  const shoulderRotationProxy = shoulderRotations.length > 0
    ? Math.max(...shoulderRotations) - Math.min(...shoulderRotations)
    : 0;

  const tempoSeries: [number, number][] = [];
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1].keypoints[16];
    const curr = frames[i].keypoints[16];

    if (prev && curr && prev.visibility > 0.5 && curr.visibility > 0.5) {
      const velocity = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) +
        Math.pow(curr.y - prev.y, 2)
      ) * 100;

      tempoSeries.push([frames[i].timestamp, velocity]);
    }
  }

  const impactFrames: number[] = [];
  for (let i = 1; i < tempoSeries.length - 1; i++) {
    if (tempoSeries[i][1] > tempoSeries[i - 1][1] &&
        tempoSeries[i][1] > tempoSeries[i + 1][1] &&
        tempoSeries[i][1] > 30) {
      impactFrames.push(tempoSeries[i][0]);
    }
  }

  return {
    elbowAngleMax: maxElbowAngle,
    shoulderRotationProxy: shoulderRotationProxy * 100,
    tempoSeries,
    impactFrames
  };
}

function calculateAngle(a: {x: number, y: number}, b: {x: number, y: number}, c: {x: number, y: number}): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180 / Math.PI);
  if (angle > 180) angle = 360 - angle;
  return angle;
}
