// Cross-reference Profile.alwaysStock with the current pantry to flag
// staples that have dropped below their floor.

import type { Item } from "../core/item.js";
import type { AlwaysStock, Profile } from "../core/profile.js";
import { totalQuantity } from "../core/item.js";

export interface StapleStatus {
  slug: string;
  required: AlwaysStock;
  haveValue: number;
  needValue: number;
  ok: boolean;
}

export function audit(profile: Profile, items: Item[]): StapleStatus[] {
  const map = new Map<string, Item>();
  for (const item of items) map.set(item.slug, item);
  const out: StapleStatus[] = [];
  for (const req of profile.alwaysStock) {
    const item = map.get(req.slug);
    let have = 0;
    if (item) {
      const total = totalQuantity(item);
      if (total && total.kind === req.unitKind) have = total.value;
    }
    out.push({
      slug: req.slug,
      required: req,
      haveValue: have,
      needValue: Math.max(0, req.minQty - have),
      ok: have >= req.minQty,
    });
  }
  return out;
}

export function notOK(rows: StapleStatus[]): StapleStatus[] {
  return rows.filter((r) => !r.ok);
}

export function format(rows: StapleStatus[]): string {
  if (rows.length === 0) return "(no staples configured)\n";
  return rows.map((r) =>
    `${r.slug.padEnd(20)} have ${r.haveValue.toFixed(1)} ${r.required.unitKind}` +
    `  need ${r.required.minQty.toFixed(1)}` +
    (r.ok ? "  ok" : `  short by ${r.needValue.toFixed(1)}`)
  ).join("\n") + "\n";
}

export function shortfallTotal(rows: StapleStatus[]): number {
  let s = 0;
  for (const r of rows) s += r.needValue;
  return s;
}
