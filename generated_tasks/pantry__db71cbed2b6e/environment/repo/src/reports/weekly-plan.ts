// Auto-suggest a 7-day meal plan from the most-frequently-cooked
// recipes plus the items currently in the pantry.

import type { Item } from "../core/item.js";
import type { MealLogEntry } from "./meal-history.js";
import type { Recipe } from "../core/recipe.js";
import { plan } from "../core/prep.js";

export interface Suggestion {
  date: string;
  recipeSlug: string;
  reason: "popular" | "covered-by-pantry" | "fresh-ingredient";
}

export interface Options {
  startDate: string;
  history: MealLogEntry[];
  recipes: Recipe[];
  pantry: Item[];
}

export function suggestWeek(opts: Options): Suggestion[] {
  const popular = topRecipes(opts.history, 10);
  const out: Suggestion[] = [];
  for (let i = 0; i < 7; i++) {
    const date = plusDays(opts.startDate, i);
    const slug = pickFor(i, popular, opts.recipes, opts.pantry);
    if (!slug) continue;
    out.push({
      date,
      recipeSlug: slug,
      reason: classify(slug, popular, opts.recipes, opts.pantry),
    });
  }
  return out;
}

function topRecipes(entries: MealLogEntry[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.recipeSlug, (counts.get(e.recipeSlug) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([s]) => s);
}

function pickFor(
  i: number,
  popular: string[],
  recipes: Recipe[],
  pantry: Item[],
): string | null {
  // Round-robin through popular; if nothing's covered, pick whatever's first.
  for (let k = 0; k < popular.length; k++) {
    const candidate = popular[(i + k) % popular.length]!;
    const r = recipes.find((x) => x.slug === candidate);
    if (!r) continue;
    const p = plan(r, pantry);
    if (p.fullyCovered) return candidate;
  }
  return popular[i % Math.max(1, popular.length)] ?? recipes[i % Math.max(1, recipes.length)]?.slug ?? null;
}

function classify(
  slug: string,
  popular: string[],
  recipes: Recipe[],
  pantry: Item[],
): Suggestion["reason"] {
  const r = recipes.find((x) => x.slug === slug);
  if (r && plan(r, pantry).fullyCovered) return "covered-by-pantry";
  if (popular.includes(slug)) return "popular";
  return "fresh-ingredient";
}

function plusDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function format(s: Suggestion[]): string {
  return s.map((x) => `${x.date}  ${x.recipeSlug.padEnd(25)} (${x.reason})`)
    .join("\n") + "\n";
}
