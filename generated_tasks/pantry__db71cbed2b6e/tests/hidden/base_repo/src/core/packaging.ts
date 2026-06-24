// Decide what package size to actually purchase from a shopping list.
// "I need 600g flour" -> "buy a 1 kg bag" (the closest standard size).

import type { ShoppingEntry } from "../core/shopping.js";

export interface PackageOption {
  slug: string;
  /** Sizes available, in canonical units (g / ml / count). */
  sizes: number[];
}

export interface PackagedSuggestion {
  entry: ShoppingEntry;
  recommend: number;
  /** "buy 2 of these to cover 600g" */
  count: number;
  totalPurchased: number;
}

export function recommend(
  entries: ShoppingEntry[],
  options: PackageOption[],
): PackagedSuggestion[] {
  const map = new Map<string, PackageOption>();
  for (const o of options) map.set(o.slug, o);

  const out: PackagedSuggestion[] = [];
  for (const e of entries) {
    const opt = map.get(e.slug);
    if (!opt || opt.sizes.length === 0) {
      out.push({
        entry: e, recommend: e.shortfall.value, count: 1,
        totalPurchased: e.shortfall.value,
      });
      continue;
    }
    const sorted = [...opt.sizes].sort((a, b) => a - b);
    const single = sorted.find((s) => s >= e.shortfall.value);
    if (single !== undefined) {
      out.push({
        entry: e, recommend: single, count: 1, totalPurchased: single,
      });
      continue;
    }
    const biggest = sorted[sorted.length - 1]!;
    const count = Math.ceil(e.shortfall.value / biggest);
    out.push({
      entry: e, recommend: biggest, count,
      totalPurchased: count * biggest,
    });
  }
  return out;
}

export function format(s: PackagedSuggestion): string {
  if (s.count === 1) {
    return `buy 1 ${s.recommend} ${s.entry.shortfall.kind} of ${s.entry.slug}`;
  }
  return `buy ${s.count} x ${s.recommend} ${s.entry.shortfall.kind} of ${s.entry.slug} (= ${s.totalPurchased})`;
}

export function totalCount(suggestions: PackagedSuggestion[]): number {
  let n = 0;
  for (const s of suggestions) n += s.count;
  return n;
}
