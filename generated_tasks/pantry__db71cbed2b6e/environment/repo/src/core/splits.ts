// Split a recipe across multiple meals (eg. "I'll cook this Sunday and
// eat it 4 times") - useful for the prep-batching workflow.

import type { Recipe } from "./recipe.js";

export interface SplitOptions {
  /** Total servings to make (e.g. 8 for a 4-serving recipe doubled). */
  totalServings: number;
  /** How many meals you'll spread that across. */
  acrossMeals: number;
}

export interface MealSplit {
  index: number;
  servings: number;
  fractionOfBatch: number;
}

export function split(recipe: Recipe, opts: SplitOptions): MealSplit[] {
  if (opts.totalServings <= 0) {
    throw new Error("split: totalServings must be > 0");
  }
  if (opts.acrossMeals <= 0) {
    throw new Error("split: acrossMeals must be > 0");
  }
  const perMeal = opts.totalServings / opts.acrossMeals;
  const out: MealSplit[] = [];
  for (let i = 0; i < opts.acrossMeals; i++) {
    out.push({
      index: i + 1,
      servings: Math.round(perMeal * 10) / 10,
      fractionOfBatch: 1 / opts.acrossMeals,
    });
  }
  return out;
}

export function batchScale(recipe: Recipe, totalServings: number): number {
  return totalServings / Math.max(1, recipe.servings);
}

export function describe(recipe: Recipe, opts: SplitOptions): string {
  const sc = batchScale(recipe, opts.totalServings);
  const lines: string[] = [];
  lines.push(`# ${recipe.slug}`);
  lines.push(`scale: ${sc.toFixed(2)}x`);
  lines.push(`splits: ${opts.acrossMeals}`);
  for (const s of split(recipe, opts)) {
    lines.push(`  meal ${s.index}: ${s.servings} servings (${(s.fractionOfBatch * 100).toFixed(0)}% of batch)`);
  }
  return lines.join("\n") + "\n";
}

export function sanityCheck(recipe: Recipe, opts: SplitOptions): string[] {
  const warnings: string[] = [];
  const sc = batchScale(recipe, opts.totalServings);
  if (sc < 0.5) warnings.push("scale below 0.5x - might be too small for the recipe");
  if (sc > 4) warnings.push("scale above 4x - might overflow your pot");
  if (opts.acrossMeals > 7) warnings.push("more than a week of meals - reheating quality drops");
  return warnings;
}
