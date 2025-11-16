import { spawn } from 'child_process';
import { promisify } from 'util';

export interface VideoInfo {
  duration: number;
  fps: number;
}

export async function getDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      videoPath
    ]);

    let output = '';
    let errorOutput = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          const duration = parseFloat(info.format.duration) || 5.0; // Default 5 seconds
          resolve(duration);
        } catch (error) {
          console.warn('Failed to parse ffprobe output, using default duration:', error);
          resolve(5.0); // Fallback duration
        }
      } else {
        console.warn('ffprobe failed, using default duration. Error:', errorOutput);
        resolve(5.0); // Fallback duration
      }
    });

    ffprobe.on('error', (error) => {
      console.warn('ffprobe command failed, using default duration:', error);
      resolve(5.0); // Fallback duration
    });
  });
}

export async function makeThumbnail(videoPath: string, outputPath: string, seekSeconds?: number): Promise<void> {
  const duration = await getDuration(videoPath);
  const seekTime = seekSeconds !== undefined ? seekSeconds : duration / 2; // Default to middle of video

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-ss', seekTime.toString(),
      '-vframes', '1',
      '-vf', 'scale=320:240',
      '-y', // Overwrite output file
      outputPath
    ]);

    let errorOutput = '';

    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('ffmpeg thumbnail generation failed:', errorOutput);
        reject(new Error(`ffmpeg failed with code ${code}: ${errorOutput}`));
      }
    });

    ffmpeg.on('error', (error) => {
      console.error('ffmpeg command failed:', error);
      reject(error);
    });
  });
}

export async function getVideoInfo(videoPath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      videoPath
    ]);

    let output = '';
    let errorOutput = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          const videoStream = info.streams.find((stream: any) => stream.codec_type === 'video');

          const duration = parseFloat(info.format.duration) || 5.0;
          let fps = 30; // Default FPS

          if (videoStream) {
            // Parse fps from r_frame_rate (e.g., "30/1" -> 30)
            if (videoStream.r_frame_rate) {
              const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
              if (den && den !== 0) {
                fps = num / den;
              }
            } else if (videoStream.avg_frame_rate) {
              const [num, den] = videoStream.avg_frame_rate.split('/').map(Number);
              if (den && den !== 0) {
                fps = num / den;
              }
            }
          }

          resolve({ duration, fps });
        } catch (error) {
          console.warn('Failed to parse video info, using defaults:', error);
          resolve({ duration: 5.0, fps: 30 }); // Fallback values
        }
      } else {
        console.warn('ffprobe failed, using default values. Error:', errorOutput);
        resolve({ duration: 5.0, fps: 30 }); // Fallback values
      }
    });

    ffprobe.on('error', (error) => {
      console.warn('ffprobe command failed, using defaults:', error);
      resolve({ duration: 5.0, fps: 30 }); // Fallback values
    });
  });
}