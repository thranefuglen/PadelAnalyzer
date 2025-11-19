<!--
	AGENTS.md consolidates AI assistant guidance. This replaces the previous
	.github/copilot-instructions.md file. Keep this concise (~50 lines) and
	project-specific. Do not add generic advice.
-->
# PadelAnalyzer AGENTS Guide

## Scope
Next.js 14 + TypeScript frontend + Python/MediaPipe analysis pipeline producing swing metrics (elbow angle, shoulder rotation proxy, tempo, impact frames) with layered fallbacks.

## Architecture Summary
Frontend UI & client pose sampling in `app/` + `components/`. API orchestration in `app/api/*`. Heavy analysis in Python (`server/python/analyze.py`) launched by `lib/analyzer.ts` when using raw video; alternative path is client pose → `/api/analyze`.

## Data Flow
Reference video → `/api/analyze-reference` (stores `data/reference-analysis.json`). User video or test video → pose frames (`lib/pose-detector.ts`) → `/api/analyze` → persisted JSON via `saveAnalysisResult`. Client polls `/api/analyses/[id]` and renders metrics & comparison.

## Key Modules
`lib/analyzer.ts`: Spawns python, cascades python → python3 → synthetic fallback; only returns `analysisId`.
`server/python/analyze.py`: MediaPipe if available else synthetic series; metrics JSON contract must stay stable.
`lib/movement-sync.ts`: Pure key‑pose detection & mapping; deterministic, side‑effect free.
`lib/pose-detector.ts`: Seeks video frame-by-frame (≈30fps); must await `onseeked` each iteration.
`lib/vercel-storage.ts` vs `lib/fs-storage.ts`: Same surface; routes prefer vercel variant for serverless.

## Metrics Conventions
`tempoSeries`: `[timestampMs, intensity]` scaled heuristically (×100/×1000). Keep scaling consistent.
Elbow angle: Indices (12,14,16). Shoulder rotation proxy: differential shoulder distance/angle. `impactFrames`: local peaks > threshold (currently >30).

## API Patterns
Validate JSON inputs explicitly; return structured `{ error }` with status code. Keep analysis responses: `{ analysisId, message }` or `{ status, result }`. Binary video routes implement Range (set `Content-Range`, `Accept-Ranges`).

## Storage
Local: `storage/uploads`, `storage/results` created lazily. Serverless: `/tmp/padelform`. Thumbnails are opportunistic (failure is non-fatal).

## UI Guidelines
Confidence color thresholds: 0.7 (green) / 0.4 (yellow). Avoid reshaping `tempoSeries` in-place; derive copies. Pose visualization relies on timestamp sync—preserve ms granularity.

## Safe Extensions
Add metrics by extending `AnalysisResult.metrics` + Python output simultaneously. Provide defaults when reading older results (optional chaining). Heavy compute should move to Python or future worker. Maintain naming (`shoulderRotationProxy`).

## Pitfalls
Skipping `await` for `onseeked` yields missing landmarks. Unavailable python deps => fallback result; mark with `meta.fallback`. Incorrect Range math breaks video playback. Avoid blocking loops in API handlers.

## Local Workflow
Install deps: `npm install`. ffmpeg required for thumbnails. Optional: `pip install mediapipe opencv-python numpy`. Run dev: `npm run dev` → http://localhost:3000.

## When Unsure
Review existing implementations before adding new algorithm branches; preserve deterministic comparisons. If modifying schema, ensure backward compatibility.

---
Feedback welcome: request sections for async queue, advanced biomech metrics, or test harness improvements.
