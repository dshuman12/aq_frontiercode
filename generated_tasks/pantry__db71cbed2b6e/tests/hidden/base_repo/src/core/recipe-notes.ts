// Tiny per-recipe notes store. One markdown file per recipe under
// <data>/recipe-notes/<slug>.md.

import fs from "node:fs/promises";
import path from "node:path";
import { dataDir, ensureAll } from "../core/paths.js";

export function file(slug: string): string {
  return path.join(dataDir(), "recipe-notes", `${slug}.md`);
}

export async function load(slug: string): Promise<string | null> {
  try {
    return await fs.readFile(file(slug), "utf8");
  } catch (err) {
    if (isENOENT(err)) return null;
    throw err;
  }
}

export async function save(slug: string, body: string): Promise<void> {
  if (!slug) throw new Error("recipe-notes: slug required");
  await ensureAll();
  await fs.mkdir(path.dirname(file(slug)), { recursive: true });
  const tmp = file(slug) + ".tmp";
  await fs.writeFile(tmp, body, "utf8");
  await fs.rename(tmp, file(slug));
}

export async function exists(slug: string): Promise<boolean> {
  try {
    await fs.access(file(slug));
    return true;
  } catch {
    return false;
  }
}

export async function remove(slug: string): Promise<boolean> {
  try {
    await fs.unlink(file(slug));
    return true;
  } catch (err) {
    if (isENOENT(err)) return false;
    throw err;
  }
}

export async function list(): Promise<string[]> {
  const dir = path.dirname(file("x"));
  try {
    const entries = await fs.readdir(dir);
    return entries
      .filter((e) => e.endsWith(".md"))
      .map((e) => e.slice(0, -3))
      .sort();
  } catch (err) {
    if (isENOENT(err)) return [];
    throw err;
  }
}

export async function append(slug: string, body: string): Promise<void> {
  const cur = (await load(slug)) ?? "";
  const sep = cur.endsWith("\n") ? "" : "\n";
  await save(slug, cur + sep + body);
}

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    (err as { code?: string }).code === "ENOENT";
}
