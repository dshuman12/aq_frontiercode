// Weekly report: per-week totals of items added / lots added / waste
// entries logged.

import type { Item } from "../core/item.js";
import { startOfWeek } from "../core/date.js";
import type { WasteEntry } from "./waste.js";

export interface WeekRow {
  weekStart: string;
  itemsAdded: number;
  lotsAdded: number;
  wasteEntries: number;
}

export function build(
  items: Item[],
  waste: WasteEntry[],
  from: string,
  to: string,
): WeekRow[] {
  const buckets = new Map<string, WeekRow>();
  function bucket(date: string): WeekRow {
    const wk = startOfWeek(date);
    if (!buckets.has(wk)) {
      buckets.set(wk, {
        weekStart: wk,
        itemsAdded: 0,
        lotsAdded: 0,
        wasteEntries: 0,
      });
    }
    return buckets.get(wk)!;
  }
  for (const item of items) {
    if (item.createdAt >= from && item.createdAt <= to) {
      bucket(item.createdAt).itemsAdded++;
    }
    for (const lot of item.lots) {
      if (lot.addedAt >= from && lot.addedAt <= to) {
        bucket(lot.addedAt).lotsAdded++;
      }
    }
  }
  for (const w of waste) {
    if (w.date >= from && w.date <= to) {
      bucket(w.date).wasteEntries++;
    }
  }
  return [...buckets.values()].sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart),
  );
}

/** Sum totals across all rows. */
export function totals(rows: WeekRow[]): WeekRow {
  const out: WeekRow = {
    weekStart: "total",
    itemsAdded: 0,
    lotsAdded: 0,
    wasteEntries: 0,
  };
  for (const r of rows) {
    out.itemsAdded += r.itemsAdded;
    out.lotsAdded += r.lotsAdded;
    out.wasteEntries += r.wasteEntries;
  }
  return out;
}
