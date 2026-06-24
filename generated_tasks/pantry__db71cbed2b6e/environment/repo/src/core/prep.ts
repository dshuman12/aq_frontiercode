// Compute the lot-by-lot consumption plan to make a recipe.
//
// Given a recipe and the current pantry, produce one ConsumptionStep
// per ingredient: which lot(s) to draw from, how much from each, and
// whether the ingredient is short-stocked.

import type { Item, Lot } from "../core/item.js";
import { lotsByExpiry, totalQuantity } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";
import type { Quantity } from "../core/units.js";
import { isZero } from "../core/units.js";

export interface DrawFromLot {
  itemSlug: string;
  lotId: number;
  amount: Quantity;
}

export interface ConsumptionStep {
  ingredientSlug: string;
  needed: Quantity;
  draws: DrawFromLot[];
  /** Outstanding need not satisfied by pantry; zero if fully covered. */
  shortfall: Quantity;
}

export interface ConsumptionPlan {
  recipeSlug: string;
  steps: ConsumptionStep[];
  fullyCovered: boolean;
}

export function plan(recipe: Recipe, pantry: Item[]): ConsumptionPlan {
  const byKind = pantryByKind(pantry);
  const steps: ConsumptionStep[] = [];
  let fullyCovered = true;

  for (const ing of recipe.ingredients) {
    const itemLots = (byKind.get(`${ing.slug}|${ing.qty.kind}`) ?? []).slice();
    let remaining: Quantity = { ...ing.qty };
    const draws: DrawFromLot[] = [];
    for (const { itemSlug, lot } of itemLots) {
      if (isZero(remaining)) break;
      const take = Math.min(lot.qty.value, remaining.value);
      if (take <= 0) continue;
      draws.push({
        itemSlug,
        lotId: lot.id,
        amount: { value: take, kind: ing.qty.kind },
      });
      remaining = { value: remaining.value - take, kind: remaining.kind };
    }
    if (!isZero(remaining)) fullyCovered = false;
    steps.push({
      ingredientSlug: ing.slug,
      needed: ing.qty,
      draws,
      shortfall: remaining,
    });
  }
  return { recipeSlug: recipe.slug, steps, fullyCovered };
}

function pantryByKind(items: Item[]): Map<string, Array<{ itemSlug: string; lot: Lot }>> {
  const out = new Map<string, Array<{ itemSlug: string; lot: Lot }>>();
  for (const item of items) {
    for (const lot of lotsByExpiry(item)) {
      const key = `${item.slug}|${lot.qty.kind}`;
      if (!out.has(key)) out.set(key, []);
      out.get(key)!.push({ itemSlug: item.slug, lot });
    }
  }
  return out;
}

export function summarize(p: ConsumptionPlan): string {
  const lines: string[] = [];
  lines.push(`# plan: ${p.recipeSlug}`);
  lines.push(`covered: ${p.fullyCovered}`);
  for (const step of p.steps) {
    lines.push(`- ${step.ingredientSlug} (${step.needed.value.toFixed(0)} ${step.needed.kind})`);
    for (const d of step.draws) {
      lines.push(`    take ${d.amount.value.toFixed(0)} from lot ${d.lotId}`);
    }
    if (!isZero(step.shortfall)) {
      lines.push(`    SHORT: ${step.shortfall.value.toFixed(0)} ${step.shortfall.kind}`);
    }
  }
  return lines.join("\n") + "\n";
}

export function planTotalDraw(p: ConsumptionPlan, slug: string): number {
  let total = 0;
  for (const step of p.steps) {
    if (step.ingredientSlug !== slug) continue;
    for (const d of step.draws) total += d.amount.value;
  }
  return total;
}

void totalQuantity;
