// Track per-unit cost so we can guess what a meal "cost" us.
//
// We persist a separate prices.jsonl - one entry per purchase. We keep
// the trailing N entries per slug to compute a moving average, so old
// inflation doesn't skew the report.

import fs from "node:fs/promises";
import path from "node:path";
import { dataDir, ensureAll } from "../core/paths.js";
import type { Quantity } from "../core/units.js";

export interface PriceEntry {
  date: string; // ISO YYYY-MM-DD
  slug: string;
  qty: Quantity;
  /** Total price paid for the qty, in cents to avoid float rounding. */
  totalCents: number;
}

const FILE = "prices.jsonl";

export function file(): string {
  return path.join(dataDir(), FILE);
}

export async function append(entry: PriceEntry): Promise<void> {
  validate(entry);
  await ensureAll();
  await fs.appendFile(file(), JSON.stringify(entry) + "\n", "utf8");
}

export async function readAll(): Promise<PriceEntry[]> {
  try {
    const text = await fs.readFile(file(), "utf8");
    const out: PriceEntry[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      out.push(JSON.parse(trimmed) as PriceEntry);
    }
    return out;
  } catch (err) {
    if (isENOENT(err)) return [];
    throw err;
  }
}

/** Per-unit cost (cents per kind-canonical) over the last N entries. */
export function recentMean(
  entries: PriceEntry[],
  slug: string,
  n: number,
): number | null {
  const matches = entries
    .filter((e) => e.slug === slug)
    .slice(-Math.max(1, n));
  if (matches.length === 0) return null;
  let totalCents = 0;
  let totalQty = 0;
  for (const e of matches) {
    totalCents += e.totalCents;
    totalQty += e.qty.value;
  }
  if (totalQty === 0) return null;
  return totalCents / totalQty;
}

/** Total cents spent on a given slug over the [from, to] window. */
export function spentInRange(
  entries: PriceEntry[],
  slug: string,
  from: string,
  to: string,
): number {
  let cents = 0;
  for (const e of entries) {
    if (e.slug !== slug) continue;
    if (e.date < from || e.date > to) continue;
    cents += e.totalCents;
  }
  return cents;
}

/** Total cents spent across all slugs in window. */
export function totalInRange(
  entries: PriceEntry[],
  from: string,
  to: string,
): number {
  let cents = 0;
  for (const e of entries) {
    if (e.date < from || e.date > to) continue;
    cents += e.totalCents;
  }
  return cents;
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function _truncate(): Promise<void> {
  await ensureAll();
  await fs.writeFile(file(), "", "utf8");
}

function validate(e: PriceEntry): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
    throw new Error("price: date must be YYYY-MM-DD");
  }
  if (!e.slug) throw new Error("price: slug required");
  if (e.qty.value <= 0) throw new Error("price: qty.value must be > 0");
  if (e.totalCents < 0) throw new Error("price: totalCents must be >= 0");
  if (!Number.isInteger(e.totalCents)) {
    throw new Error("price: totalCents must be integer cents");
  }
}

function isENOENT(err: unknown): boolean {
  return typeof err === "object" && err !== null &&
    (err as { code?: string }).code === "ENOENT";
}
