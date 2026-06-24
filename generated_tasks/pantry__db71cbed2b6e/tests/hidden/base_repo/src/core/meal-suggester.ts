// "What can I cook tonight?" - rank recipes by what's already covered.
//
// Score = (covered_ingredients / total_ingredients) - 0.05 * minutes_over_30
// so quicker meals win narrow ties.

import type { Item } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";
import { plan } from "../core/prep.js";

export interface Suggestion {
  recipeSlug: string;
  totalIngredients: number;
  coveredIngredients: number;
  coverage: number;
  totalMinutes: number;
  score: number;
  reason: "fully-covered" | "mostly-covered" | "partial";
}

export function suggest(
  recipes: Recipe[],
  pantry: Item[],
): Suggestion[] {
  const out: Suggestion[] = [];
  for (const r of recipes) {
    const p = plan(r, pantry);
    const total = p.steps.length;
    if (total === 0) continue;
    let covered = 0;
    for (const step of p.steps) {
      if (step.shortfall.value <= 0.0005) covered++;
    }
    const coverage = covered / total;
    const minutes = r.totalMinutes ?? 60;
    const overhead = Math.max(0, minutes - 30) * 0.05;
    out.push({
      recipeSlug: r.slug,
      totalIngredients: total,
      coveredIngredients: covered,
      coverage,
      totalMinutes: minutes,
      score: coverage - overhead / 100,
      reason: classify(coverage),
    });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

function classify(coverage: number): Suggestion["reason"] {
  if (coverage >= 0.999) return "fully-covered";
  if (coverage >= 0.7) return "mostly-covered";
  return "partial";
}

export function topN(in_: Suggestion[], n: number): Suggestion[] {
  return in_.slice(0, Math.max(0, n));
}

export function format(s: Suggestion): string {
  return `${s.recipeSlug}  cov=${(s.coverage * 100).toFixed(0)}%  ` +
    `${s.coveredIngredients}/${s.totalIngredients}  ` +
    `${s.totalMinutes}min  [${s.reason}]`;
}
