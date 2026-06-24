// Higher-order analytics across pantry + history.

import type { Item } from "../core/item.js";
import type { MealLogEntry } from "./meal-history.js";
import type { WasteEntry } from "./waste.js";

export interface CrossReport {
  mostUsedSlugs: Array<{ slug: string; count: number }>;
  mostWastedSlugs: Array<{ slug: string; count: number }>;
  mostUsedRecipes: Array<{ slug: string; count: number }>;
  pantrySize: number;
  totalLots: number;
  /** Slugs in the pantry that haven't appeared in any recipe lately. */
  rarelyUsed: string[];
  /** Slugs cooked often but rarely in the pantry (always need to buy). */
  alwaysShort: string[];
}

export function build(opts: {
  items: Item[];
  meals: MealLogEntry[];
  waste: WasteEntry[];
  recipesByMeal: Map<string, Array<{ slug: string }>>;
  windowDays?: number;
}): CrossReport {
  const slugUseCount = new Map<string, number>();
  for (const m of opts.meals) {
    const ings = opts.recipesByMeal.get(m.recipeSlug) ?? [];
    for (const ing of ings) {
      slugUseCount.set(ing.slug, (slugUseCount.get(ing.slug) ?? 0) + 1);
    }
  }
  const wasteCount = new Map<string, number>();
  for (const w of opts.waste) {
    wasteCount.set(w.slug, (wasteCount.get(w.slug) ?? 0) + 1);
  }
  const recipeCount = new Map<string, number>();
  for (const m of opts.meals) {
    recipeCount.set(m.recipeSlug, (recipeCount.get(m.recipeSlug) ?? 0) + 1);
  }
  const pantrySlugs = new Set(opts.items.map((i) => i.slug));
  const rarelyUsed: string[] = [];
  for (const slug of pantrySlugs) {
    if ((slugUseCount.get(slug) ?? 0) === 0) rarelyUsed.push(slug);
  }
  const alwaysShort: string[] = [];
  for (const [slug, count] of slugUseCount) {
    if (count >= 3 && !pantrySlugs.has(slug)) alwaysShort.push(slug);
  }
  return {
    mostUsedSlugs: topN(slugUseCount, 10),
    mostWastedSlugs: topN(wasteCount, 10),
    mostUsedRecipes: topN(recipeCount, 10),
    pantrySize: opts.items.length,
    totalLots: opts.items.reduce((acc, i) => acc + i.lots.length, 0),
    rarelyUsed: rarelyUsed.sort(),
    alwaysShort: alwaysShort.sort(),
  };
}

function topN(m: Map<string, number>, n: number): Array<{ slug: string; count: number }> {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([slug, count]) => ({ slug, count }));
}

export function format(r: CrossReport): string {
  const lines: string[] = [];
  lines.push(`# Cross report`);
  lines.push("");
  lines.push(`pantry: ${r.pantrySize} items, ${r.totalLots} lots`);
  lines.push("");
  lines.push("## Most-used ingredients");
  for (const e of r.mostUsedSlugs) lines.push(`- ${e.slug}  (${e.count})`);
  lines.push("");
  lines.push("## Most-wasted slugs");
  for (const e of r.mostWastedSlugs) lines.push(`- ${e.slug}  (${e.count})`);
  lines.push("");
  if (r.rarelyUsed.length > 0) {
    lines.push("## Rarely-used items in pantry");
    for (const s of r.rarelyUsed) lines.push(`- ${s}`);
    lines.push("");
  }
  if (r.alwaysShort.length > 0) {
    lines.push("## Always short");
    for (const s of r.alwaysShort) lines.push(`- ${s}`);
  }
  return lines.join("\n") + "\n";
}
