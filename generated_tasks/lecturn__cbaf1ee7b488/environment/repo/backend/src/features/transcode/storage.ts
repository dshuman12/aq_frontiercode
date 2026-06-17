import { statfs } from "node:fs/promises";
import { resolve } from "node:path";
import { env } from "~/config/env";

// One directory per episode so removing the row can rm -rf the bundle cleanly.
export function episodeOutputDir(episodeId: string): string {
  return resolve(env.MEDIA_ROOT, "transcoded", episodeId);
}

export interface DiskStatus {
  freeBytes: number;
  totalBytes: number;
  freeGb: number;
  underThreshold: boolean;
}

export async function checkDisk(): Promise<DiskStatus> {
  const stats = await statfs(resolve(env.MEDIA_ROOT));
  const freeBytes = stats.bavail * stats.bsize;
  const totalBytes = stats.blocks * stats.bsize;
  const freeGb = freeBytes / 1024 ** 3;
  return {
    freeBytes,
    totalBytes,
    freeGb,
    underThreshold: freeGb < env.TRANSCODE_DISK_THRESHOLD_GB,
  };
}
