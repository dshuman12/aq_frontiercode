// Compare two pantry snapshots: report added / removed / changed items.
// Items are matched by slug.

import type { Item } from "./item.js";

export interface Pair {
  before: Item;
  after: Item;
}

export interface DiffResult {
  added: Item[];
  removed: Item[];
  changed: Pair[];
}

export function diff(before: Item[], after: Item[]): DiffResult {
  const beforeMap = new Map<string, Item>(before.map((i) => [i.slug, i]));
  const afterMap = new Map<string, Item>(after.map((i) => [i.slug, i]));
  const result: DiffResult = { added: [], removed: [], changed: [] };
  for (const [slug, item] of afterMap) {
    const prev = beforeMap.get(slug);
    if (!prev) {
      result.added.push(item);
      continue;
    }
    if (!equals(prev, item)) {
      result.changed.push({ before: prev, after: item });
    }
  }
  for (const [slug, item] of beforeMap) {
    if (!afterMap.has(slug)) result.removed.push(item);
  }
  return result;
}

function equals(a: Item, b: Item): boolean {
  if (a.name !== b.name) return false;
  if ((a.category ?? "") !== (b.category ?? "")) return false;
  if (a.lots.length !== b.lots.length) return false;
  for (let i = 0; i < a.lots.length; i++) {
    const la = a.lots[i]!;
    const lb = b.lots[i]!;
    if (la.id !== lb.id) return false;
    if (la.qty.value !== lb.qty.value) return false;
    if (la.qty.kind !== lb.qty.kind) return false;
    if (la.where !== lb.where) return false;
    if ((la.bestBy ?? "") !== (lb.bestBy ?? "")) return false;
  }
  return true;
}

export function summary(d: DiffResult): string {
  return `added: ${d.added.length}  removed: ${d.removed.length}  changed: ${d.changed.length}`;
}

/** Just the slugs that changed in any way. */
export function changedSlugs(d: DiffResult): string[] {
  const out = new Set<string>();
  for (const i of d.added) out.add(i.slug);
  for (const i of d.removed) out.add(i.slug);
  for (const p of d.changed) out.add(p.after.slug);
  return [...out].sort();
}
