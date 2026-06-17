import { spawn } from "node:child_process";

export interface ProbeResult {
  durationSec: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string | null;
  bitrate: number;
}

export function probeFile(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      "-show_streams",
      filePath,
    ]);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe exited ${code}: ${stderr.trim() || "unknown"}`));
      }
      try {
        const data = JSON.parse(stdout);
        const video = data.streams.find((s: { codec_type?: string }) => s.codec_type === "video");
        const audio = data.streams.find((s: { codec_type?: string }) => s.codec_type === "audio");
        if (!video) return reject(new Error("No video stream"));

        resolve({
          durationSec: Math.round(Number.parseFloat(data.format?.duration ?? "0")),
          width: video.width ?? 0,
          height: video.height ?? 0,
          videoCodec: video.codec_name ?? "unknown",
          audioCodec: audio?.codec_name ?? null,
          bitrate: Number.parseInt(data.format?.bit_rate ?? "0", 10),
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error("ffprobe JSON parse failed"));
      }
    });
  });
}
