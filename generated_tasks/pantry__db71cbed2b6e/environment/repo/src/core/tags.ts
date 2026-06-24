// Per-item tag tracking. We don't store tags directly on Item; instead,
// we keep a separate aliases map at <data>/tags.json.

import fs from "node:fs/promises";
import path from "node:path";
import { dataDir, ensureAll } from "../core/paths.js";

export interface TagsFile {
  /** slug -> tags */
  bySlug: Record<string, string[]>;
}

export function file(): string {
  return path.join(dataDir(), "tags.json");
}

export async function load(): Promise<TagsFile> {
  try {
    const raw = await fs.readFile(file(), "utf8");
    return JSON.parse(raw) as TagsFile;
  } catch (err) {
    if (isENOENT(err)) return { bySlug: {} };
    throw err;
  }
}

export async function save(t: TagsFile): Promise<void> {
  await ensureAll();
  const tmp = file() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(t, null, 2), "utf8");
  await fs.rename(tmp, file());
}

export async function add(slug: string, tags: string[]): Promise<void> {
  const file = await load();
  const cur = new Set(file.bySlug[slug] ?? []);
  for (const t of tags) cur.add(normalize(t));
  file.bySlug[slug] = [...cur].sort();
  await save(file);
}

export async function remove(slug: string, tags: string[]): Promise<void> {
  const file = await load();
  const cur = new Set(file.bySlug[slug] ?? []);
  for (const t of tags) cur.delete(normalize(t));
  if (cur.size === 0) delete file.bySlug[slug];
  else file.bySlug[slug] = [...cur].sort();
  await save(file);
}

export async function listFor(slug: string): Promise<string[]> {
  const file = await load();
  return file.bySlug[slug] ?? [];
}

export async function bySlug(): Promise<Record<string, string[]>> {
  const file = await load();
  return file.bySlug;
}

export async function counts(): Promise<Record<string, number>> {
  const file = await load();
  const out: Record<string, number> = {};
  for (const tags of Object.values(file.bySlug)) {
    for (const t of tags) out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}

export async function topN(n: number): Promise<Array<{ tag: string; count: number }>> {
  const c = await counts();
  return Object.entries(c)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([tag, count]) => ({ tag, count }));
}

function normalize(t: string): string {
  return t.toLowerCase().trim();
}

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    (err as { code?: string }).code === "ENOENT";
}
