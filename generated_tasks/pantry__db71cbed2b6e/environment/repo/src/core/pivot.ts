// 2-D rollup matrix. By default we pivot category x lot-added month
// from the items list, so callers can see "how many things were added
// per category in each month".

import type { Item } from "./item.js";

export type RowKeyFn = (item: Item, lotIdx: number) => string;
export type ColKeyFn = (item: Item, lotIdx: number) => string;

export interface PivotResult {
  rowKeys: string[];
  colKeys: string[];
  cells: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grand: number;
}

export function build(
  items: Item[],
  rowFn: RowKeyFn,
  colFn: ColKeyFn,
): PivotResult {
  const cells: Record<string, Record<string, number>> = {};
  const rowKeys = new Set<string>();
  const colKeys = new Set<string>();
  for (const item of items) {
    item.lots.forEach((_lot, idx) => {
      const r = rowFn(item, idx);
      const c = colFn(item, idx);
      rowKeys.add(r);
      colKeys.add(c);
      if (!cells[r]) cells[r] = {};
      cells[r]![c] = (cells[r]![c] ?? 0) + 1;
    });
  }
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grand = 0;
  for (const r of rowKeys) {
    let rt = 0;
    for (const c of colKeys) {
      const v = cells[r]?.[c] ?? 0;
      rt += v;
      colTotals[c] = (colTotals[c] ?? 0) + v;
      grand += v;
    }
    rowTotals[r] = rt;
  }
  return {
    rowKeys: [...rowKeys].sort(),
    colKeys: [...colKeys].sort(),
    cells,
    rowTotals,
    colTotals,
    grand,
  };
}

export const KEY_BY_CATEGORY: RowKeyFn = (i) => i.category ?? "(none)";
export const KEY_BY_LOCATION: ColKeyFn = (_i, idx) => "(any)";
export const KEY_BY_LOT_LOCATION: ColKeyFn = (i, idx) => i.lots[idx]!.where;
export const KEY_BY_LOT_MONTH: ColKeyFn = (i, idx) => i.lots[idx]!.addedAt.slice(0, 7);
export const KEY_BY_SLUG: RowKeyFn = (i) => i.slug;
export const KEY_BY_BARCODE: RowKeyFn = (i) => i.barcode ?? "(no-barcode)";

export function format(p: PivotResult): string {
  const lines: string[] = [];
  const head = ["", ...p.colKeys, "= total"];
  lines.push(head.join("\t"));
  for (const r of p.rowKeys) {
    const cols = p.colKeys.map((c) => String(p.cells[r]?.[c] ?? 0));
    lines.push([r, ...cols, String(p.rowTotals[r] ?? 0)].join("\t"));
  }
  const totalsRow = ["= total", ...p.colKeys.map((c) => String(p.colTotals[c] ?? 0)), String(p.grand)];
  lines.push(totalsRow.join("\t"));
  return lines.join("\n") + "\n";
}
