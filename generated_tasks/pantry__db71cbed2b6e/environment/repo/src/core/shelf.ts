// Per-shelf assignments. Lots get a shelf number on top of their
// location ("fridge bottom shelf" / "pantry shelf 3").

import type { Item, Lot } from "../core/item.js";

export interface Shelf {
  location: string;
  shelfNumber: number;
}

export function shelfFor(lot: Lot, defaultShelf = 1): Shelf {
  const m = /shelf:(\d+)/.exec(lot.notes ?? "");
  if (m) {
    return { location: lot.where, shelfNumber: Number.parseInt(m[1]!, 10) };
  }
  return { location: lot.where, shelfNumber: defaultShelf };
}

export function groupByShelf(items: Item[]): Map<string, Item[]> {
  const out = new Map<string, Item[]>();
  for (const item of items) {
    for (const lot of item.lots) {
      const s = shelfFor(lot);
      const key = `${s.location}/${s.shelfNumber}`;
      if (!out.has(key)) out.set(key, []);
      const existing = out.get(key)!;
      if (!existing.some((x) => x.id === item.id)) existing.push(item);
    }
  }
  return out;
}

import type { Location } from "../core/item.js";

export function moveLot(item: Item, lotId: number, newWhere: Location): Item {
  const next: Item = { ...item, lots: item.lots.map((l) => ({ ...l })) };
  for (const lot of next.lots) {
    if (lot.id === lotId) lot.where = newWhere;
  }
  return next;
}

export function shelfReport(items: Item[]): string {
  const groups = groupByShelf(items);
  const sortedKeys = [...groups.keys()].sort();
  const lines: string[] = [];
  for (const key of sortedKeys) {
    lines.push(`# ${key}`);
    const itemList = groups.get(key)!;
    for (const item of itemList.sort((a, b) => a.slug.localeCompare(b.slug))) {
      lines.push(`- ${item.slug}`);
    }
    lines.push("");
  }
  return lines.join("\n") + "\n";
}

export function totalShelves(items: Item[]): number {
  return groupByShelf(items).size;
}
