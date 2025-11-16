import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { saveAnalysisResult } from '@/lib/vercel-storage';
import type { AnalysisResult } from '@/lib/vercel-storage';
import type { PoseFrame } from '@/lib/pose-data';
import path from 'path';
import fs from 'fs/promises';

const TEST_VIDEO_PATH = path.join(process.cwd(), 'PadelVideos', 'Bad Slice.mp4');
const REFERENCE_VIDEO_PATH = path.join(process.cwd(), 'PadelVideos', 'Good slice.mp4');
const REFERENCE_DATA_PATH = path.join(process.cwd(), 'data', 'reference-analysis.json');

export async function POST(request: NextRequest) {
  try {
    const { uploadId, poseData, fps } = await request.json();

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      );
    }

    if (!poseData || !Array.isArray(poseData)) {
      return NextResponse.json(
        { error: 'Pose data is required' },
        { status: 400 }
      );
    }

    const analysisId = uuidv4();
    const frames = poseData as PoseFrame[];

    // Calculate metrics from pose data
    const metrics = calculateMetricsFromPose(frames);

    // Load reference data if available
    let referenceMetrics = null;
    let comparison = null;
    try {
      const refData = await fs.readFile(REFERENCE_DATA_PATH, 'utf-8');
      const referenceAnalysis = JSON.parse(refData);
      referenceMetrics = referenceAnalysis.metrics;

      // Calculate comparison
      comparison = {
        elbowAngleDiff: metrics.elbowAngleMax - referenceMetrics.elbowAngleMax,
        shoulderRotationDiff: metrics.shoulderRotationProxy - referenceMetrics.shoulderRotationProxy,
        referenceVideo: referenceAnalysis.videoName
      };
    } catch (error) {
      console.log('No reference data found, skipping comparison');
    }

    // Create analysis result from real pose detection
    const analysisResult: AnalysisResult = {
      summary: {
        strokeGuess: "volley",
        confidence: 0.85
      },
      metrics,
      referenceMetrics,
      comparison,
      meta: {
        fps: fps || 30,
        sampleMs: frames.length > 1 ? frames[1].timestamp - frames[0].timestamp : 33,
        framesUsed: frames.length,
        fallback: false,
        videoPath: TEST_VIDEO_PATH
      },
      poseData: frames
    };

    // Save the analysis result
    await saveAnalysisResult(analysisId, analysisResult);

    return NextResponse.json({
      analysisId,
      message: 'Analysis completed successfully using real pose detection'
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze video' },
      { status: 500 }
    );
  }
}

function calculateMetricsFromPose(frames: PoseFrame[]) {
  // Calculate elbow angle (right arm - index 14 = right elbow, 12 = right shoulder, 16 = right wrist)
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

  // Calculate shoulder rotation proxy (distance between shoulders over time)
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

  // Create tempo series (wrist velocity over time)
  const tempoSeries: [number, number][] = [];
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1].keypoints[16]; // right wrist
    const curr = frames[i].keypoints[16];

    if (prev && curr && prev.visibility > 0.5 && curr.visibility > 0.5) {
      const velocity = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) +
        Math.pow(curr.y - prev.y, 2)
      ) * 100; // Scale up for visibility

      tempoSeries.push([frames[i].timestamp, velocity]);
    }
  }

  // Detect impact frames (peaks in velocity)
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