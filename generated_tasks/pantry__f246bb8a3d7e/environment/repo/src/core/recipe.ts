// Recipe model. A recipe is a name + a list of ingredients (each with
// a target quantity that may or may not be in the same unit-kind as
// what the pantry stores).
//
// Recipes are intentionally NOT a meal plan or shopping list - those
// are higher-level constructs that consume recipe data.

import type { Quantity } from "./units.js";

export interface Ingredient {
  /** Slug of the pantry item the ingredient maps to. */
  slug: string;
  /** Required quantity for one batch of the recipe. */
  qty: Quantity;
  /** Optional substitution slugs. */
  substitutions?: string[];
  /** Optional note: "to taste", "if you have it", etc. */
  notes?: string;
}

export interface Recipe {
  id: number;
  slug: string;
  name: string;
  /** Optional cuisine / category tag. */
  category?: string;
  /** Yield - typically "servings". */
  servings: number;
  /** Active prep + cook time in minutes. */
  totalMinutes?: number;
  ingredients: Ingredient[];
  /** Free-form prose - we don't try to step-parse. */
  steps?: string;
  /** Tags for search. */
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidRecipeSlug(s: string): boolean {
  return SLUG_RE.test(s);
}

export function recipeIngredientCount(r: Recipe): number {
  return r.ingredients.length;
}

export function totalQuantityOf(r: Recipe, slug: string): Quantity | null {
  let kind: Quantity["kind"] | null = null;
  let value = 0;
  for (const ing of r.ingredients) {
    if (ing.slug !== slug) continue;
    if (kind === null) {
      kind = ing.qty.kind;
      value = ing.qty.value;
    } else if (ing.qty.kind === kind) {
      value += ing.qty.value;
    } else {
      return null;
    }
  }
  return kind === null ? null : { value, kind };
}

/** Scale every ingredient quantity by a factor. */
export function scaleRecipe(r: Recipe, factor: number): Recipe {
  if (!Number.isFinite(factor) || factor <= 0) {
    throw new Error("recipe: scale factor must be positive finite");
  }
  return {
    ...r,
    servings: Math.max(1, Math.round(r.servings * factor)),
    ingredients: r.ingredients.map((i) => ({
      ...i,
      qty: { ...i.qty, value: i.qty.value * factor },
    })),
  };
}

/** Deduplicate two ingredient lists, summing quantities of the same slug+kind. */
export function mergeIngredients(
  a: Ingredient[],
  b: Ingredient[],
): Ingredient[] {
  const out = new Map<string, Ingredient>();
  for (const ing of [...a, ...b]) {
    const key = `${ing.slug}|${ing.qty.kind}`;
    const cur = out.get(key);
    if (!cur) {
      out.set(key, { ...ing, qty: { ...ing.qty } });
    } else {
      cur.qty.value += ing.qty.value;
    }
  }
  return [...out.values()];
}

export function hasTag(r: Recipe, tag: string): boolean {
  return (r.tags ?? []).includes(tag);
}
