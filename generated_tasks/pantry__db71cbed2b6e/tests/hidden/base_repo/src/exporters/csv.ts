// CSV exporter (round-trip-friendly with the receipt importer's columns).

import { encodeRow } from "../importers/csv-parser.js";
import type { Item } from "../core/item.js";
import { format as fmtQ } from "../core/units.js";

export function render(items: Item[]): string {
  const lines: string[] = [];
  const header = ["slug", "name", "category", "lot", "qty", "where", "best_by", "source", "notes"];
  lines.push(encodeRow(header));
  for (const item of items) {
    if (item.lots.length === 0) {
      lines.push(encodeRow([
        item.slug,
        item.name,
        item.category ?? "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]));
      continue;
    }
    for (const lot of item.lots) {
      lines.push(encodeRow([
        item.slug,
        item.name,
        item.category ?? "",
        String(lot.id),
        fmtQ(lot.qty),
        lot.where,
        lot.bestBy ?? "",
        lot.source ?? "",
        lot.notes ?? "",
      ]));
    }
  }
  return lines.join("\n") + "\n";
}
