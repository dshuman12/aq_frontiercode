// Inventory snapshot per location, per category. Useful for printing
// "what's in the fridge?" tables.

import type { Item } from "../core/item.js";
import { format as fmtQ } from "../core/units.js";
import { totalQuantity } from "../core/item.js";
import { newTable } from "../format/table.js";

export interface InventoryRow {
  slug: string;
  name: string;
  category?: string;
  totalDisplay: string;
  lotCount: number;
}

export function rows(items: Item[], where: string): InventoryRow[] {
  const out: InventoryRow[] = [];
  for (const item of items) {
    const lots = item.lots.filter((l) => l.where === where);
    if (lots.length === 0) continue;
    const reduced: Item = { ...item, lots };
    const total = totalQuantity(reduced);
    const row: InventoryRow = {
      slug: item.slug,
      name: item.name,
      totalDisplay: total ? fmtQ(total) : "-",
      lotCount: lots.length,
    };
    if (item.category) row.category = item.category;
    out.push(row);
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export function table(items: Item[], where: string): string {
  const tbl = newTable().setHeader(["slug", "category", "lots", "total"]);
  for (const r of rows(items, where)) {
    tbl.addRow(r.slug, r.category ?? "", String(r.lotCount), r.totalDisplay);
  }
  return tbl.toString();
}

export function summary(items: Item[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of items) {
    for (const lot of item.lots) {
      out.set(lot.where, (out.get(lot.where) ?? 0) + 1);
    }
  }
  return out;
}
