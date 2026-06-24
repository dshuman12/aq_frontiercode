// Push / pull JSON files between two store roots.
// (We can't safely move binary blobs via this; pantry only has JSON.)

import fs from "node:fs/promises";
import path from "node:path";

export type Mode = "skip-existing" | "overwrite" | "newer";

export interface SyncResult {
  copied: number;
  skipped: number;
  errors: Error[];
}

export async function sync(
  src: string,
  dst: string,
  mode: Mode = "newer",
): Promise<SyncResult> {
  const result: SyncResult = { copied: 0, skipped: 0, errors: [] };
  if (!src || !dst) {
    throw new Error("replicate: src and dst required");
  }
  await fs.mkdir(dst, { recursive: true });
  const srcStat = await fs.stat(src);
  if (!srcStat.isDirectory()) throw new Error("replicate: src not a directory");
  await walk(src, async (file) => {
    if (!file.endsWith(".json")) return;
    const rel = path.relative(src, file);
    const dest = path.join(dst, rel);
    if (await shouldCopy(file, dest, mode)) {
      try {
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.copyFile(file, dest);
        result.copied++;
      } catch (err) {
        result.errors.push(err as Error);
      }
    } else {
      result.skipped++;
    }
  });
  return result;
}

async function shouldCopy(src: string, dst: string, mode: Mode): Promise<boolean> {
  let dstExists = false;
  let dstMtime = 0;
  try {
    const s = await fs.stat(dst);
    dstExists = true;
    dstMtime = s.mtimeMs;
  } catch {
    dstExists = false;
  }
  if (!dstExists) return true;
  if (mode === "overwrite") return true;
  if (mode === "skip-existing") return false;
  const s = await fs.stat(src);
  return s.mtimeMs > dstMtime;
}

async function walk(dir: string, cb: (file: string) => Promise<void>): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const p = path.join(dir, name);
    const stat = await fs.stat(p);
    if (stat.isDirectory()) await walk(p, cb);
    else await cb(p);
  }
}

export async function countJSON(root: string): Promise<number> {
  let n = 0;
  await walk(root, async (file) => {
    if (file.endsWith(".json")) n++;
  });
  return n;
}
