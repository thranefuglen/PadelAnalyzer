# AI Coding Agent Instructions for PadelAnalyzer

## Purpose & Scope
PadelAnalyzer is a Next.js 14 (App Router) + TypeScript MVP that ingests short padel videos and produces technique metrics (elbow angle, shoulder rotation proxy, tempo, impact frames) via a Python + MediaPipe pipeline with robust fallbacks.

## High-Level Architecture
- Frontend (UI + visualization) in `app/` pages + `components/` (client components only where interactivity needed).
- API routes in `app/api/*` act as lightweight orchestration (upload, analyze, fetch results, provide reference video/data).
- Analysis pipeline: video uploaded → `POST /api/analyze` (currently pose JSON path) or Python script via `lib/analyzer.ts` for direct file analysis → metrics JSON persisted.
- Storage abstraction: local filesystem (`lib/fs-storage.ts`) vs serverless temp (`lib/vercel-storage.ts`). Most API routes import from `vercel-storage` ensuring portability.
- Python script `server/python/analyze.py` tries MediaPipe; falls back to synthetic metrics if dependencies missing.

## Core Data Flow (Reference + User Comparison)
1. Reference video served via `/api/reference-video` and analyzed/stored through `/api/analyze-reference` (PUT saves JSON to `data/reference-analysis.json`).
2. User video (currently test harness uses predefined files in `PadelVideos/`) → pose extraction client-side (`lib/pose-detector.ts`) → POST to `/api/analyze` with pose frames.
3. API builds `AnalysisResult` (optionally merges reference metrics + comparison block) and saves via `saveAnalysisResult`.
4. Client fetches `/api/analyses/[id]` to render summary, charts, comparison, pose visualization.

## Key File Responsibilities
- `lib/analyzer.ts`: Node wrapper spawning Python; implements multi-tier fallback (python → python3 → synthetic). Do not block event loop; returns `analysisId` only.
- `server/python/analyze.py`: MediaPipe/OpenCV analysis, generates metrics JSON; supports fallback generation; stdout minimal, progress in stderr.
- `lib/movement-sync.ts`: Pure functions for detecting key poses & time/segment mapping; keep deterministic & side-effect free.
- `lib/pose-detector.ts`: Client-side sampling @ ~30fps; ensure async frame seeking (wait for `onseeked`). Avoid increasing sampling density without throttling.
- `lib/vercel-storage.ts` vs `lib/fs-storage.ts`: Provide same shaped helpers; prefer `vercel-storage` in routes for serverless compatibility.

## Metrics & Conventions
- `tempoSeries`: Array of `[timestampMs, intensity]`; scaling factors (×100 or ×1000) are heuristics—preserve existing scaling when extending.
- Elbow angle: Right shoulder(12), elbow(14), wrist(16); computed via vector dot product or angle utility in Python.
- Shoulder rotation proxy: Variation in inter-shoulder distance or angle; consistent naming `shoulderRotationProxy` across TS + Python.
- Impact detection: Local peaks over threshold (currently >30 intensity) with simple neighbor comparison.

## API Route Patterns
- Always validate presence/type of JSON fields (e.g. `poseData` array) and return structured error with HTTP status.
- Long operations currently run inline; if introducing async queue keep response schema: `{ analysisId, status }` for consistency.
- Use `NextResponse.json` uniformly; stream binaries (videos) with range support in video endpoints.

## Storage & Environment
- Local dev creates `storage/uploads` + `storage/results` lazily (`ensureStorageDirectories`).
- Serverless uses `/tmp/padelform/*`; do not assume persistence across deployments.
- Thumbnails via `makeThumbnail` (ffmpeg) are opportunistic; code tolerates failure silently.

## Frontend Component Patterns
- Metrics rendering: `AnalysisSummary` uses simple semantic decisions (confidence color thresholds 0.7/0.4). Maintain thresholds unless backed by model changes.
- Charts: `AnalysisCharts` expects pre-processed `tempoSeries`; do not mutate data shape in place—create new arrays for derived analytics.
- Pose visualization: Sync via timestamps; changing FPS logic requires aligned `timestamp` semantics.

## Safe Extension Guidelines
- When adding new metrics: extend `AnalysisResult.metrics` & Python JSON output simultaneously; preserve backward compatibility (optional chaining or defaults when reading older results).
- Avoid blocking Node API routes with CPU heavy loops—move compute into Python or future worker queue.
- If replacing storage layer, keep helper signatures (`saveAnalysisResult`, `getAnalysisResult`) stable.

## Common Pitfalls
- Seeking video frames too rapidly in `pose-detector.ts` without awaiting `onseeked` yields empty landmarks.
- Missing Python deps triggers fallback synthetic data—document in responses via `meta.fallback`.
- Range requests must respect `Content-Range` headers; always compute chunk sizes accurately.

## Local Development Workflow
1. Install Node deps: `npm install`
2. Ensure `ffmpeg` available (`ffmpeg -version`) for thumbnails.
3. Optional: `pip install mediapipe opencv-python numpy` for real analysis.
4. Run dev server: `npm run dev` → open `http://localhost:3000`.

## When Unsure
Prefer inspecting existing pure utility patterns (e.g. detection in Python or TypeScript sync logic) before introducing new algorithmic branches. Maintain deterministic outputs for comparison features.

---
Provide feedback: Which sections need deeper detail (e.g. async refactor, adding new metric, queue integration)?
