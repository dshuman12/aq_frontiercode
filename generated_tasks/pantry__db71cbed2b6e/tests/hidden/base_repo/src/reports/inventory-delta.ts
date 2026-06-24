// Diff two pantry inventories and emit "+200ml olive-oil" style deltas.

import type { Item } from "../core/item.js";
import { totalQuantity } from "../core/item.js";
import { format as fmtQ } from "../core/units.js";

export interface DeltaRow {
  slug: string;
  beforeValue: number;
  afterValue: number;
  delta: number;
  unit: string;
}

export function diff(before: Item[], after: Item[]): DeltaRow[] {
  const beforeMap = byTotal(before);
  const afterMap = byTotal(after);
  const slugs = new Set<string>([...beforeMap.keys(), ...afterMap.keys()]);
  const out: DeltaRow[] = [];
  for (const slug of slugs) {
    const b = beforeMap.get(slug);
    const a = afterMap.get(slug);
    const beforeValue = b?.value ?? 0;
    const afterValue = a?.value ?? 0;
    if (beforeValue === afterValue) continue;
    const unit = (a?.unit ?? b?.unit) ?? "count";
    out.push({
      slug, beforeValue, afterValue,
      delta: afterValue - beforeValue,
      unit,
    });
  }
  out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return out;
}

function byTotal(items: Item[]): Map<string, { value: number; unit: string }> {
  const out = new Map<string, { value: number; unit: string }>();
  for (const item of items) {
    const t = totalQuantity(item);
    if (!t) continue;
    out.set(item.slug, { value: t.value, unit: t.kind });
  }
  return out;
}

export function format(rows: DeltaRow[]): string {
  return rows
    .map((r) => {
      const sign = r.delta > 0 ? "+" : "";
      return `${sign}${r.delta.toFixed(0)} ${r.unit.padEnd(6)}  ${r.slug}`;
    })
    .join("\n") + "\n";
}

export function summary(rows: DeltaRow[]): string {
  const ups = rows.filter((r) => r.delta > 0).length;
  const downs = rows.filter((r) => r.delta < 0).length;
  return `+${ups} -${downs} (total ${rows.length} changed)`;
}

export function biggestGain(rows: DeltaRow[]): DeltaRow | null {
  return rows.reduce<DeltaRow | null>(
    (best, cur) => (cur.delta > 0 && (best === null || cur.delta > best.delta) ? cur : best),
    null,
  );
}

export function biggestLoss(rows: DeltaRow[]): DeltaRow | null {
  return rows.reduce<DeltaRow | null>(
    (best, cur) => (cur.delta < 0 && (best === null || cur.delta < best.delta) ? cur : best),
    null,
  );
}

void fmtQ;
