// Bundle the pantry data dir into a tarball-of-JSON. We write our own
// tiny "tar" format - just a JSON manifest plus the files concatenated -
// since pulling in a real tar implementation would balloon the deps.

import fs from "node:fs/promises";
import path from "node:path";
import { dataDir } from "./paths.js";

interface ArchiveEntry {
  name: string;
  size: number;
  body: string;
}

export interface Archive {
  version: 1;
  generatedAt: string;
  entries: ArchiveEntry[];
}

export async function build(): Promise<Archive> {
  const root = dataDir();
  const entries = await collect(root, root);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries,
  };
}

export function serialize(a: Archive): string {
  return JSON.stringify(a, null, 2);
}

export function parse(text: string): Archive {
  const a = JSON.parse(text) as Archive;
  validate(a);
  return a;
}

export async function restore(a: Archive, into: string): Promise<number> {
  validate(a);
  let n = 0;
  for (const entry of a.entries) {
    const dest = path.join(into, entry.name);
    if (path.relative(into, dest).startsWith("..")) {
      throw new Error(`archive: refusing to write outside dest: ${entry.name}`);
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, entry.body, "utf8");
    n++;
  }
  return n;
}

async function collect(root: string, dir: string): Promise<ArchiveEntry[]> {
  const out: ArchiveEntry[] = [];
  let listing: string[];
  try {
    listing = await fs.readdir(dir);
  } catch {
    return out;
  }
  for (const name of listing) {
    const full = path.join(dir, name);
    const stat = await fs.stat(full);
    if (stat.isDirectory()) {
      out.push(...await collect(root, full));
      continue;
    }
    const body = await fs.readFile(full, "utf8");
    out.push({
      name: path.relative(root, full),
      size: stat.size,
      body,
    });
  }
  return out;
}

function validate(a: Archive): void {
  if (a.version !== 1) {
    throw new Error(`archive: unsupported version ${a.version}`);
  }
  if (!Array.isArray(a.entries)) {
    throw new Error("archive: entries must be array");
  }
  for (const entry of a.entries) {
    if (!entry.name) throw new Error("archive: entry missing name");
    if (entry.name.includes("..")) {
      throw new Error(`archive: dangerous entry name "${entry.name}"`);
    }
    if (typeof entry.body !== "string") {
      throw new Error("archive: body must be string");
    }
  }
}

export function totalBytes(a: Archive): number {
  let n = 0;
  for (const e of a.entries) n += e.size;
  return n;
}
