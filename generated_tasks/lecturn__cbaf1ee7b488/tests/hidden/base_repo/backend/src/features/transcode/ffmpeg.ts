import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { RenditionSpec } from "./renditions";

interface TranscodeOptions {
  inputPath: string;
  outputDir: string;
  rendition: RenditionSpec;
  durationSec: number;
  // Progress in [0, 1].
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
}

interface TranscodeResult {
  manifestPath: string;
  segmentsDir: string;
}

const SEGMENT_DURATION_SEC = 6;

export async function transcodeRendition(
  opts: TranscodeOptions,
): Promise<TranscodeResult> {
  const renditionDir = join(opts.outputDir, `${opts.rendition.height}p`);
  await mkdir(renditionDir, { recursive: true });

  const manifestPath = join(renditionDir, "index.m3u8");
  const segmentPattern = join(renditionDir, "seg_%05d.ts");
  const { width, height, bitrateKbps, audioBitrateKbps } = opts.rendition;

  const args = [
    "-i", opts.inputPath,
    "-y",
    // force_divisible_by=2 keeps both dims even — libx264 with yuv420p refuses odd dimensions.
    "-vf", `scale=w=${width}:h=${height}:force_original_aspect_ratio=decrease:force_divisible_by=2`,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "21",
    "-maxrate", `${bitrateKbps}k`,
    "-bufsize", `${bitrateKbps * 2}k`,
    "-profile:v", "main",
    "-level", "4.0",
    "-pix_fmt", "yuv420p",
    // Keyframe every segment at 30fps so HLS chunks can stand alone.
    "-g", String(SEGMENT_DURATION_SEC * 30),
    "-keyint_min", String(SEGMENT_DURATION_SEC * 30),
    "-sc_threshold", "0",
    "-c:a", "aac",
    "-ar", "48000",
    "-b:a", `${audioBitrateKbps}k`,
    "-ac", "2",
    "-f", "hls",
    "-hls_time", String(SEGMENT_DURATION_SEC),
    "-hls_playlist_type", "vod",
    "-hls_segment_filename", segmentPattern,
    "-progress", "pipe:2",
    manifestPath,
  ];

  return new Promise<TranscodeResult>((resolve, reject) => {
    const child = spawn("ffmpeg", args);
    const onAbort = () => child.kill("SIGTERM");
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    let buffer = "";
    child.stderr.on("data", (chunk) => {
      buffer += chunk.toString();
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        const match = /out_time_us=(\d+)/.exec(line);
        if (match && opts.durationSec > 0) {
          const elapsedSec = Number.parseInt(match[1]!, 10) / 1_000_000;
          const pct = Math.max(0, Math.min(1, elapsedSec / opts.durationSec));
          opts.onProgress?.(pct);
        }
      }
    });

    child.on("error", (err) => {
      opts.signal?.removeEventListener("abort", onAbort);
      reject(err);
    });
    child.on("close", (code) => {
      opts.signal?.removeEventListener("abort", onAbort);
      if (code === 0) {
        resolve({ manifestPath, segmentsDir: renditionDir });
      } else if (opts.signal?.aborted) {
        reject(new Error("transcode aborted"));
      } else {
        reject(new Error(`ffmpeg exited ${code} for ${opts.rendition.height}p`));
      }
    });
  });
}

interface MasterPlaylistInput {
  // Bits per second.
  bandwidth: number;
  width: number;
  height: number;
  manifestRelativePath: string;
  codecs?: string;
}

export function buildMasterPlaylist(renditions: MasterPlaylistInput[]): string {
  const lines = ["#EXTM3U", "#EXT-X-VERSION:6"];
  for (const r of renditions) {
    const codecs = r.codecs ?? "avc1.4d401f,mp4a.40.2";
    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${r.bandwidth},RESOLUTION=${r.width}x${r.height},CODECS="${codecs}"`,
    );
    lines.push(r.manifestRelativePath);
  }
  return `${lines.join("\n")}\n`;
}
