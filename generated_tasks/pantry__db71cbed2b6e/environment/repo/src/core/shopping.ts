// Build a shopping list from a list of recipe IDs (or slugs) plus
// optional explicit add-ons.
//
// For each ingredient: find what we already have in the pantry, and
// emit a "need: X" entry only for the shortfall.

import type { Item, Lot } from "./item.js";
import type { Ingredient, Recipe } from "./recipe.js";
import type { Quantity } from "./units.js";
import { isZero } from "./units.js";

export interface ShoppingEntry {
  slug: string;
  /** Aggregated need across all included recipes. */
  totalNeeded: Quantity;
  /** What we already have in the pantry of this slug+kind. */
  alreadyHave: Quantity;
  /** Outstanding amount to buy. */
  shortfall: Quantity;
  /** Recipe slugs that contributed to this entry. */
  recipes: string[];
  /** Optional notes assembled from recipes. */
  notes: string[];
}

export interface ShoppingList {
  entries: ShoppingEntry[];
  generatedAt: string;
}

export interface BuildOptions {
  recipes: Recipe[];
  pantry: Item[];
  /** Recipe slug -> servings to make (defaults to recipe.servings). */
  servingOverrides?: Map<string, number>;
  /** One-off "and also pick up X" entries. */
  extras?: Ingredient[];
  /** ISO date used in the output stamp. */
  today?: string;
}

export function build(opts: BuildOptions): ShoppingList {
  const aggregated = new Map<string, ShoppingEntry>();
  const have = pantryByKind(opts.pantry);

  for (const r of opts.recipes) {
    const factor = computeFactor(r, opts.servingOverrides);
    for (const ing of r.ingredients) {
      addNeed(aggregated, r.slug, scaleIngredient(ing, factor), ing.notes);
    }
  }
  for (const e of opts.extras ?? []) {
    addNeed(aggregated, "(extra)", e, e.notes);
  }
  for (const entry of aggregated.values()) {
    const have_ = have.get(`${entry.slug}|${entry.totalNeeded.kind}`) ??
      ({ value: 0, kind: entry.totalNeeded.kind } as Quantity);
    entry.alreadyHave = have_;
    const shortVal = Math.max(0, entry.totalNeeded.value - have_.value);
    entry.shortfall = { value: shortVal, kind: entry.totalNeeded.kind };
  }
  return {
    entries: [...aggregated.values()].sort((a, b) =>
      a.slug.localeCompare(b.slug)
    ),
    generatedAt: opts.today ?? new Date().toISOString().slice(0, 10),
  };
}

export function shortfallOnly(list: ShoppingList): ShoppingEntry[] {
  return list.entries.filter((e) => !isZero(e.shortfall));
}

function computeFactor(
  r: Recipe,
  overrides?: Map<string, number>,
): number {
  if (!overrides) return 1;
  const desired = overrides.get(r.slug);
  if (!desired || desired <= 0) return 1;
  return desired / Math.max(1, r.servings);
}

function scaleIngredient(ing: Ingredient, factor: number): Ingredient {
  if (factor === 1) return ing;
  return { ...ing, qty: { ...ing.qty, value: ing.qty.value * factor } };
}

function addNeed(
  map: Map<string, ShoppingEntry>,
  recipeSlug: string,
  ing: Ingredient,
  notes?: string,
): void {
  const key = `${ing.slug}|${ing.qty.kind}`;
  const cur = map.get(key);
  if (cur) {
    cur.totalNeeded = { ...cur.totalNeeded, value: cur.totalNeeded.value + ing.qty.value };
    if (!cur.recipes.includes(recipeSlug)) cur.recipes.push(recipeSlug);
    if (notes) cur.notes.push(notes);
    return;
  }
  map.set(key, {
    slug: ing.slug,
    totalNeeded: { ...ing.qty },
    alreadyHave: { value: 0, kind: ing.qty.kind },
    shortfall: { value: ing.qty.value, kind: ing.qty.kind },
    recipes: [recipeSlug],
    notes: notes ? [notes] : [],
  });
}

function pantryByKind(items: Item[]): Map<string, Quantity> {
  const out = new Map<string, Quantity>();
  for (const item of items) {
    for (const lot of item.lots) {
      const key = `${item.slug}|${lot.qty.kind}`;
      const cur = out.get(key);
      if (cur) {
        cur.value += lot.qty.value;
      } else {
        out.set(key, { value: lot.qty.value, kind: lot.qty.kind });
      }
    }
  }
  return out;
}

/** Turn a ShoppingList into a flat string suitable for printing/copying. */
export function format(list: ShoppingList): string {
  const lines: string[] = [];
  lines.push(`# shopping list - ${list.generatedAt}`);
  for (const entry of list.entries) {
    if (isZero(entry.shortfall)) continue;
    lines.push(
      `- ${entry.slug}: ${entry.shortfall.value.toFixed(1)} ${entry.shortfall.kind}` +
        ` (need ${entry.totalNeeded.value.toFixed(1)}, have ${entry.alreadyHave.value.toFixed(1)})`,
    );
  }
  return lines.join("\n") + "\n";
}
