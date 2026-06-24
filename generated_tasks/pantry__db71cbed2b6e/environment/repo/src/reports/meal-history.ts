// Per-day "what did we cook" log. Persisted at <data>/meals.jsonl.

import fs from "node:fs/promises";
import path from "node:path";
import { dataDir, ensureAll } from "../core/paths.js";

export interface MealLogEntry {
  date: string;
  meal: string;
  recipeSlug: string;
  servings: number;
  notes?: string;
}

const FILE = "meals.jsonl";

export function file(): string {
  return path.join(dataDir(), FILE);
}

export async function append(entry: MealLogEntry): Promise<void> {
  validate(entry);
  await ensureAll();
  await fs.appendFile(file(), JSON.stringify(entry) + "\n", "utf8");
}

export async function readAll(): Promise<MealLogEntry[]> {
  try {
    const text = await fs.readFile(file(), "utf8");
    const out: MealLogEntry[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      out.push(JSON.parse(trimmed) as MealLogEntry);
    }
    return out;
  } catch (err) {
    if (isENOENT(err)) return [];
    throw err;
  }
}

export function inMonth(entries: MealLogEntry[], yyyymm: string): MealLogEntry[] {
  return entries.filter((e) => e.date.startsWith(yyyymm));
}

export function topRecipes(
  entries: MealLogEntry[],
  n: number,
): Array<{ slug: string; count: number }> {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.recipeSlug, (counts.get(e.recipeSlug) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([slug, count]) => ({ slug, count }));
}

export async function _truncate(): Promise<void> {
  await ensureAll();
  await fs.writeFile(file(), "", "utf8");
}

function validate(e: MealLogEntry): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
    throw new Error("meals: date must be YYYY-MM-DD");
  }
  if (!e.meal) throw new Error("meals: meal required");
  if (!e.recipeSlug) throw new Error("meals: recipeSlug required");
  if (e.servings <= 0) throw new Error("meals: servings must be > 0");
}

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    (err as { code?: string }).code === "ENOENT";
}
