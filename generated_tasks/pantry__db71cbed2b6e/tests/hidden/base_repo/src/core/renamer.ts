// Rename a slug across the entire pantry + recipe corpus, with a
// dry-run mode and an audit-log entry.

import type { Item } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";

export interface RenamePlan {
  itemRenames: Array<{ id: number; from: string; to: string }>;
  recipeRenames: Array<{ id: number; from: string; to: string }>;
  recipeIngredientChanges: Array<{ recipeId: number; recipeSlug: string; ingredientSlug: string }>;
}

export function plan(
  fromSlug: string,
  toSlug: string,
  items: Item[],
  recipes: Recipe[],
): RenamePlan {
  if (!fromSlug || !toSlug) throw new Error("rename: from/to required");
  if (fromSlug === toSlug) {
    return { itemRenames: [], recipeRenames: [], recipeIngredientChanges: [] };
  }
  const itemRenames: RenamePlan["itemRenames"] = [];
  for (const item of items) {
    if (item.slug === fromSlug) {
      itemRenames.push({ id: item.id, from: item.slug, to: toSlug });
    }
  }
  const recipeRenames: RenamePlan["recipeRenames"] = [];
  for (const r of recipes) {
    if (r.slug === fromSlug) {
      recipeRenames.push({ id: r.id, from: r.slug, to: toSlug });
    }
  }
  const ingredientChanges: RenamePlan["recipeIngredientChanges"] = [];
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      if (ing.slug === fromSlug) {
        ingredientChanges.push({
          recipeId: r.id, recipeSlug: r.slug, ingredientSlug: ing.slug,
        });
      }
    }
  }
  return { itemRenames, recipeRenames, recipeIngredientChanges: ingredientChanges };
}

export function apply(
  p: RenamePlan,
  items: Item[],
  recipes: Recipe[],
  toSlug: string,
): { items: Item[]; recipes: Recipe[] } {
  const updatedItems = items.map((item) => {
    const rename = p.itemRenames.find((r) => r.id === item.id);
    return rename ? { ...item, slug: toSlug } : item;
  });
  const updatedRecipes = recipes.map((r) => {
    const rename = p.recipeRenames.find((x) => x.id === r.id);
    const newR = rename ? { ...r, slug: toSlug } : { ...r };
    newR.ingredients = newR.ingredients.map((ing) =>
      p.recipeIngredientChanges.some((c) =>
        c.recipeId === r.id && c.ingredientSlug === ing.slug
      )
        ? { ...ing, slug: toSlug }
        : ing
    );
    return newR;
  });
  return { items: updatedItems, recipes: updatedRecipes };
}

export function summarize(p: RenamePlan): string {
  return `items: ${p.itemRenames.length}  recipes: ${p.recipeRenames.length}  ingredient refs: ${p.recipeIngredientChanges.length}`;
}
