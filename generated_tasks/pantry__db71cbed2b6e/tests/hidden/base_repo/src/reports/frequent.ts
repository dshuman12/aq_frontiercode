// Frequent-buy report: which items have had the most lots added in
// a given window. Useful for "what should I always have on hand?".

import type { Item } from "../core/item.js";

export interface FrequencyEntry {
  slug: string;
  lotCount: number;
  daysCovered: number;
  /** Average lots per 30-day period in the window. */
  per30Days: number;
}

/** Compute how often each item gets restocked over a [from, to] window. */
export function buildFrequencyReport(
  items: Item[],
  from: string,
  to: string,
): FrequencyEntry[] {
  const out: FrequencyEntry[] = [];
  const fromTs = Date.parse(from + "T00:00:00Z");
  const toTs = Date.parse(to + "T00:00:00Z");
  const days = Math.max(1, Math.round((toTs - fromTs) / 86400000));
  for (const item of items) {
    let count = 0;
    for (const lot of item.lots) {
      if (lot.addedAt >= from && lot.addedAt <= to) count++;
    }
    if (count === 0) continue;
    out.push({
      slug: item.slug,
      lotCount: count,
      daysCovered: days,
      per30Days: round1((count * 30) / days),
    });
  }
  out.sort((a, b) => b.lotCount - a.lotCount);
  return out;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Top N entries from a frequency report. */
export function topN(entries: FrequencyEntry[], n: number): FrequencyEntry[] {
  return entries.slice(0, Math.max(0, n));
}

/** Sum of all lotCount values. */
export function totalLots(entries: FrequencyEntry[]): number {
  let n = 0;
  for (const e of entries) n += e.lotCount;
  return n;
}
