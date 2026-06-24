// Waste tracking. We persist a log of "thrown out" entries (slug + qty
// + reason + date) and produce per-month summaries.
//
// The log lives at <data>/waste.jsonl. We keep it append-only so it
// can be tailed safely.

import fs from "node:fs/promises";
import path from "node:path";
import { dataDir, ensureAll } from "../core/paths.js";
import type { Quantity } from "../core/units.js";
import { writeJSONL, readJSONL } from "../importers/jsonl.js";

export interface WasteEntry {
  date: string; // ISO YYYY-MM-DD
  slug: string;
  qty: Quantity;
  reason: "expired" | "spoiled" | "burnt" | "other";
  notes?: string;
}

export interface WasteSummary {
  totalEntries: number;
  byReason: Record<string, number>;
  bySlug: Map<string, Quantity[]>;
  byMonth: Map<string, number>;
}

export function file(): string {
  return path.join(dataDir(), "waste.jsonl");
}

export async function append(entry: WasteEntry): Promise<void> {
  validate(entry);
  await ensureAll();
  await fs.appendFile(file(), JSON.stringify(entry) + "\n", "utf8");
}

export async function readAll(): Promise<WasteEntry[]> {
  try {
    const text = await fs.readFile(file(), "utf8");
    return readJSONL<WasteEntry>(text);
  } catch (err) {
    if (isENOENT(err)) return [];
    throw err;
  }
}

export function summarise(entries: WasteEntry[]): WasteSummary {
  const sum: WasteSummary = {
    totalEntries: entries.length,
    byReason: { expired: 0, spoiled: 0, burnt: 0, other: 0 },
    bySlug: new Map(),
    byMonth: new Map(),
  };
  for (const e of entries) {
    sum.byReason[e.reason] = (sum.byReason[e.reason] ?? 0) + 1;
    if (!sum.bySlug.has(e.slug)) sum.bySlug.set(e.slug, []);
    sum.bySlug.get(e.slug)!.push(e.qty);
    const ym = e.date.slice(0, 7);
    sum.byMonth.set(ym, (sum.byMonth.get(ym) ?? 0) + 1);
  }
  return sum;
}

export function topWastedSlugs(
  entries: WasteEntry[],
  n: number,
): Array<{ slug: string; count: number }> {
  const counts = new Map<string, number>();
  for (const e of entries) {
    counts.set(e.slug, (counts.get(e.slug) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([slug, count]) => ({ slug, count }));
}

export function inMonth(entries: WasteEntry[], yyyymm: string): WasteEntry[] {
  return entries.filter((e) => e.date.startsWith(yyyymm));
}

export async function _truncate(): Promise<void> {
  await ensureAll();
  await fs.writeFile(file(), "", "utf8");
}

function validate(e: WasteEntry): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
    throw new Error("waste: date must be YYYY-MM-DD");
  }
  if (!e.slug) throw new Error("waste: slug required");
  if (e.qty.value <= 0) throw new Error("waste: qty must be > 0");
  if (!["expired", "spoiled", "burnt", "other"].includes(e.reason)) {
    throw new Error("waste: invalid reason");
  }
  // touch jsonl import so type imports stay live
  void writeJSONL;
}

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    (err as { code?: string }).code === "ENOENT";
}
