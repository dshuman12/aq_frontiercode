import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

interface SpriteOptions {
  inputPath: string;
  outputPath: string;
  durationSec: number;
  intervalSec: number;
  thumbWidth: number;
  thumbHeight: number;
}

interface SpriteResult {
  cols: number;
  rows: number;
  count: number;
}

// Returned (cols, rows) lets the player CSS-position a single sheet instead of fetching each frame.
export async function generateSpriteSheet(opts: SpriteOptions): Promise<SpriteResult> {
  await mkdir(dirname(opts.outputPath), { recursive: true });

  const count = Math.max(1, Math.ceil(opts.durationSec / opts.intervalSec));
  // Cap columns at 10 so very long episodes don't produce ultra-wide images browsers struggle with.
  const cols = Math.min(10, Math.max(1, Math.ceil(Math.sqrt(count))));
  const rows = Math.ceil(count / cols);

  const fps = 1 / opts.intervalSec;
  const args = [
    "-y",
    "-i", opts.inputPath,
    "-vf", `fps=${fps},scale=${opts.thumbWidth}:${opts.thumbHeight}:force_original_aspect_ratio=decrease:force_divisible_by=2,tile=${cols}x${rows}`,
    "-frames:v", "1",
    "-an",
    opts.outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args);
    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg sprite-sheet exited ${code}: ${stderr.slice(-300)}`));
    });
  });

  return { cols, rows, count };
}

interface CoverOptions {
  inputPath: string;
  outputPath: string;
  atSec: number;
}

export async function extractCoverFrame(opts: CoverOptions): Promise<void> {
  await mkdir(dirname(opts.outputPath), { recursive: true });
  const args = [
    "-y",
    "-ss", String(opts.atSec),
    "-i", opts.inputPath,
    "-frames:v", "1",
    "-q:v", "2",
    opts.outputPath,
  ];
  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args);
    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg cover exited ${code}: ${stderr.slice(-300)}`));
    });
  });
}

export function spriteSheetPath(mediaRoot: string, episodeId: string): string {
  return join(mediaRoot, "thumbs", `${episodeId}.jpg`);
}

export function coverPath(mediaRoot: string, courseId: string): string {
  return join(mediaRoot, "covers", `${courseId}.jpg`);
}
