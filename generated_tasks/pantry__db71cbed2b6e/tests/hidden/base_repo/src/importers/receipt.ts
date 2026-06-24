// Import a receipt-style CSV (one row per line item) into the pantry.
//
// Expected headers (case-insensitive, any subset):
//   item, slug, qty, where, best_by, category, source, notes
//
// Rows missing both `item` and `slug` are silently skipped.

import { headerIndex, parseCSV } from "./csv-parser.js";
import { parseQuantity, type Quantity } from "../core/units.js";
import { isValidLocation, toSlug, type Location, type Lot } from "../core/item.js";
import { isISODate, today } from "../core/date.js";

export interface ImportedItem {
  slug: string;
  name: string;
  category?: string;
  lot: Lot;
}

export interface ImportResult {
  added: ImportedItem[];
  skipped: number;
  warnings: string[];
}

export function readReceiptCSV(text: string): ImportResult {
  const rows = parseCSV(text);
  if (rows.length === 0) {
    return { added: [], skipped: 0, warnings: ["empty file"] };
  }
  const header = rows[0]!.values;
  const idx = headerIndex(header);
  const result: ImportResult = { added: [], skipped: 0, warnings: [] };
  let lotCounter = 1;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]!;
    const item = readItem(row.values, idx, lotCounter);
    if (item === null) {
      result.skipped++;
      continue;
    }
    if (typeof item === "string") {
      result.warnings.push(`line ${row.line}: ${item}`);
      result.skipped++;
      continue;
    }
    result.added.push(item);
    lotCounter++;
  }
  return result;
}

function readItem(
  cells: string[],
  idx: Map<string, number>,
  lotID: number,
): ImportedItem | string | null {
  const cell = (k: string): string => {
    const i = idx.get(k);
    if (i === undefined) return "";
    return (cells[i] ?? "").trim();
  };
  const itemRaw = cell("item");
  const slugRaw = cell("slug");
  if (!itemRaw && !slugRaw) return null;
  const slug = slugRaw ? slugRaw.toLowerCase() : toSlug(itemRaw);
  const name = itemRaw || slug;
  const qtyRaw = cell("qty");
  if (!qtyRaw) return `missing qty for ${name}`;
  let qty: Quantity;
  try {
    qty = parseQuantity(qtyRaw);
  } catch (err) {
    return `bad qty "${qtyRaw}" for ${name}: ${(err as Error).message}`;
  }
  const where = (cell("where") || "pantry").toLowerCase();
  if (!isValidLocation(where)) {
    return `bad location "${where}" for ${name}`;
  }
  const bestBy = cell("best_by");
  if (bestBy && !isISODate(bestBy)) {
    return `bad best_by "${bestBy}" for ${name}`;
  }
  const lot: Lot = {
    id: lotID,
    qty,
    addedAt: today(),
    where: where as Location,
    source: cell("source") || "receipt",
  };
  if (bestBy) lot.bestBy = bestBy;
  const notes = cell("notes");
  if (notes) lot.notes = notes;
  const out: ImportedItem = { slug, name, lot };
  const category = cell("category");
  if (category) out.category = category;
  return out;
}
