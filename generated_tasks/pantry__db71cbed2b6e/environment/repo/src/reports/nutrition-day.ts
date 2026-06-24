// Per-day macro estimate from the meal-history log + recipe definitions.

import type { MealLogEntry } from "./meal-history.js";
import type { Recipe } from "../core/recipe.js";
import type { Macros } from "../core/nutrition.js";
import { addMacros, emptyMacros, macrosFor } from "../core/nutrition.js";

export interface DayTotals {
  date: string;
  totals: Macros;
  meals: number;
}

export function perDay(
  history: MealLogEntry[],
  recipes: Recipe[],
): DayTotals[] {
  const recipeMap = new Map<string, Recipe>(recipes.map((r) => [r.slug, r]));
  const map = new Map<string, DayTotals>();
  for (const entry of history) {
    const r = recipeMap.get(entry.recipeSlug);
    if (!r) continue;
    let recipeMacros = emptyMacros();
    for (const ing of r.ingredients) {
      const m = macrosFor(ing.slug, ing.qty);
      if (m) recipeMacros = addMacros(recipeMacros, m);
    }
    const factor = entry.servings / Math.max(1, r.servings);
    const eaten = scaleMacros(recipeMacros, factor);
    const cur = map.get(entry.date);
    if (cur) {
      cur.totals = addMacros(cur.totals, eaten);
      cur.meals++;
    } else {
      map.set(entry.date, { date: entry.date, totals: eaten, meals: 1 });
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function scaleMacros(m: Macros, factor: number): Macros {
  return {
    cal: m.cal * factor,
    protein: m.protein * factor,
    carbs: m.carbs * factor,
    fat: m.fat * factor,
  };
}

export function average(totals: DayTotals[]): Macros {
  if (totals.length === 0) return emptyMacros();
  let sum = emptyMacros();
  for (const d of totals) sum = addMacros(sum, d.totals);
  return {
    cal: sum.cal / totals.length,
    protein: sum.protein / totals.length,
    carbs: sum.carbs / totals.length,
    fat: sum.fat / totals.length,
  };
}

export function highest(totals: DayTotals[]): DayTotals | null {
  if (totals.length === 0) return null;
  return totals.reduce((best, cur) => (cur.totals.cal > best.totals.cal ? cur : best));
}

export function lowest(totals: DayTotals[]): DayTotals | null {
  if (totals.length === 0) return null;
  return totals.reduce((best, cur) => (cur.totals.cal < best.totals.cal ? cur : best));
}

export function inMonth(totals: DayTotals[], yyyymm: string): DayTotals[] {
  return totals.filter((d) => d.date.startsWith(yyyymm));
}
