// Vercel-compatible storage using temporary files
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import { PoseFrame } from './pose-data';

export interface AnalysisResult {
  summary: {
    strokeGuess: string;
    confidence: number;
  };
  metrics: {
    elbowAngleMax: number;
    shoulderRotationProxy: number;
    tempoSeries: [number, number][];
    impactFrames: number[];
  };
  referenceMetrics?: {
    elbowAngleMax: number;
    shoulderRotationProxy: number;
    tempoSeries: [number, number][];
    impactFrames: number[];
  } | null;
  comparison?: {
    elbowAngleDiff: number;
    shoulderRotationDiff: number;
    referenceVideo: string;
  } | null;
  meta: {
    fps: number;
    sampleMs: number;
    framesUsed: number;
    fallback?: boolean;
    videoPath?: string;
  };
  poseData?: PoseFrame[];
}

// Use /tmp directory for serverless environments
const getTempDir = () => {
  if (process.env.VERCEL) {
    return '/tmp';
  }
  return os.tmpdir();
};

const STORAGE_BASE = path.join(getTempDir(), 'padelform');
const UPLOADS_DIR = path.join(STORAGE_BASE, 'uploads');
const RESULTS_DIR = path.join(STORAGE_BASE, 'results');

export async function ensureStorageDirectories() {
  await fs.mkdir(STORAGE_BASE, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.mkdir(RESULTS_DIR, { recursive: true });
}

export async function saveUploadedFile(buffer: Buffer, originalName: string): Promise<{ uploadId: string; filePath: string }> {
  await ensureStorageDirectories();

  const uploadId = uuidv4();
  const extension = path.extname(originalName).toLowerCase();
  const fileName = `${uploadId}${extension}`;
  const filePath = path.join(UPLOADS_DIR, fileName);

  await fs.writeFile(filePath, buffer);

  return { uploadId, filePath };
}

export async function saveAnalysisResult(analysisId: string, result: AnalysisResult): Promise<void> {
  await ensureStorageDirectories();

  const resultPath = path.join(RESULTS_DIR, `${analysisId}.json`);
  await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
}

export async function getAnalysisResult(analysisId: string): Promise<AnalysisResult | null> {
  try {
    const resultPath = path.join(RESULTS_DIR, `${analysisId}.json`);
    const data = await fs.readFile(resultPath, 'utf8');
    return JSON.parse(data) as AnalysisResult;
  } catch (error) {
    return null;
  }
}

export async function getThumbnailPath(analysisId: string): Promise<string | null> {
  const thumbnailPath = path.join(RESULTS_DIR, `${analysisId}.jpg`);
  try {
    await fs.access(thumbnailPath);
    return thumbnailPath;
  } catch {
    return null;
  }
}

export function getUploadPath(uploadId: string, extension: string = '.mp4'): string {
  return path.join(UPLOADS_DIR, `${uploadId}${extension}`);
}

export function getResultsDir(): string {
  return RESULTS_DIR;
}

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}