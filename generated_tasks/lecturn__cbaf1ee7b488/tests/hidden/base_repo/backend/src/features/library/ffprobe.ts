import { spawn } from "node:child_process";

interface ProbeResult {
  durationSec: number;
}

// Returns 0 on any failure so one corrupt file can't block a sync.
export function probe(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve) => {
    const child = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);

    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.on("error", () => resolve({ durationSec: 0 }));
    child.on("close", () => {
      const seconds = Math.round(Number.parseFloat(stdout.trim()));
      resolve({ durationSec: Number.isFinite(seconds) ? seconds : 0 });
    });
  });
}

const CONCURRENCY = 4;

export async function probeMany(paths: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  let cursor = 0;

  async function worker() {
    while (cursor < paths.length) {
      const i = cursor++;
      const p = paths[i];
      if (!p) continue;
      const { durationSec } = await probe(p);
      out.set(p, durationSec);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return out;
}
