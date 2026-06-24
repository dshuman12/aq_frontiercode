// A meal plan is a date -> recipe-slugs mapping. We persist as a
// single JSON file under the data dir.

import fs from "node:fs/promises";
import path from "node:path";
import { dataDir, ensureAll } from "./paths.js";

export interface PlanEntry {
  date: string; // ISO YYYY-MM-DD
  meal: string; // "breakfast" | "lunch" | "dinner" | "snack"
  recipeSlug: string;
  servings?: number;
  notes?: string;
}

export interface Plan {
  entries: PlanEntry[];
}

const FILE = "plan.json";

export function planFile(): string {
  return path.join(dataDir(), FILE);
}

export async function load(): Promise<Plan> {
  try {
    const raw = await fs.readFile(planFile(), "utf8");
    return JSON.parse(raw) as Plan;
  } catch (err) {
    if (isENOENT(err)) return { entries: [] };
    throw err;
  }
}

export async function save(plan: Plan): Promise<void> {
  await ensureAll();
  const tmp = planFile() + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(plan, null, 2), "utf8");
  await fs.rename(tmp, planFile());
}

export async function add(entry: PlanEntry): Promise<void> {
  validate(entry);
  const plan = await load();
  plan.entries.push(entry);
  await save(plan);
}

export async function removeByDate(date: string): Promise<number> {
  const plan = await load();
  const before = plan.entries.length;
  plan.entries = plan.entries.filter((e) => e.date !== date);
  await save(plan);
  return before - plan.entries.length;
}

/** Filter entries whose date falls in [from, to] inclusive. */
export function inRange(plan: Plan, from: string, to: string): PlanEntry[] {
  return plan.entries.filter((e) => e.date >= from && e.date <= to);
}

export function recipeSlugs(plan: Plan, from?: string, to?: string): string[] {
  const entries = (from && to) ? inRange(plan, from, to) : plan.entries;
  return [...new Set(entries.map((e) => e.recipeSlug))];
}

function validate(e: PlanEntry): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
    throw new Error("plan: date must be YYYY-MM-DD");
  }
  if (!e.meal) throw new Error("plan: meal required");
  if (!e.recipeSlug) throw new Error("plan: recipeSlug required");
  if (e.servings !== undefined && e.servings <= 0) {
    throw new Error("plan: servings must be > 0");
  }
}

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    (err as { code?: string }).code === "ENOENT";
}
