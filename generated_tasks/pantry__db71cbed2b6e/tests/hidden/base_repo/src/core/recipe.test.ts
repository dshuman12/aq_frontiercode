import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hasTag,
  isValidRecipeSlug,
  mergeIngredients,
  recipeIngredientCount,
  scaleRecipe,
  totalQuantityOf,
  type Recipe,
} from "./recipe.js";

const baseRecipe: Recipe = {
  id: 1,
  slug: "minestrone",
  name: "Minestrone",
  servings: 4,
  ingredients: [
    { slug: "tomato", qty: { value: 800, kind: "mass" } },
    { slug: "olive-oil", qty: { value: 30, kind: "volume" } },
    { slug: "tomato", qty: { value: 200, kind: "mass" } },
  ],
  createdAt: "2025-12-01",
  updatedAt: "2025-12-01",
};

test("isValidRecipeSlug", () => {
  assert.equal(isValidRecipeSlug("minestrone"), true);
  assert.equal(isValidRecipeSlug("white-bean-soup"), true);
  assert.equal(isValidRecipeSlug("Minestrone"), false);
  assert.equal(isValidRecipeSlug(""), false);
  assert.equal(isValidRecipeSlug("two--dashes"), false);
});

test("recipeIngredientCount", () => {
  assert.equal(recipeIngredientCount(baseRecipe), 3);
});

test("totalQuantityOf sums same-kind", () => {
  const q = totalQuantityOf(baseRecipe, "tomato");
  assert.equal(q?.value, 1000);
  assert.equal(q?.kind, "mass");
});

test("totalQuantityOf returns null for missing slug", () => {
  assert.equal(totalQuantityOf(baseRecipe, "nope"), null);
});

test("totalQuantityOf null on mixed kinds", () => {
  const r: Recipe = {
    ...baseRecipe,
    ingredients: [
      { slug: "x", qty: { value: 1, kind: "mass" } },
      { slug: "x", qty: { value: 1, kind: "volume" } },
    ],
  };
  assert.equal(totalQuantityOf(r, "x"), null);
});

test("scaleRecipe scales every ingredient + servings", () => {
  const doubled = scaleRecipe(baseRecipe, 2);
  assert.equal(doubled.servings, 8);
  assert.equal(doubled.ingredients[0]?.qty.value, 1600);
});

test("scaleRecipe rejects bad factor", () => {
  assert.throws(() => scaleRecipe(baseRecipe, 0));
  assert.throws(() => scaleRecipe(baseRecipe, -1));
  assert.throws(() => scaleRecipe(baseRecipe, NaN));
});

test("scaleRecipe rounds servings up to at least 1", () => {
  const halved = scaleRecipe(baseRecipe, 0.1);
  assert.ok(halved.servings >= 1);
});

test("mergeIngredients dedupes by slug+kind", () => {
  const merged = mergeIngredients(
    [{ slug: "salt", qty: { value: 5, kind: "mass" } }],
    [
      { slug: "salt", qty: { value: 3, kind: "mass" } },
      { slug: "pepper", qty: { value: 2, kind: "mass" } },
    ],
  );
  assert.equal(merged.length, 2);
  const salt = merged.find((m) => m.slug === "salt");
  assert.equal(salt?.qty.value, 8);
});

test("mergeIngredients keeps mixed kinds separate", () => {
  const merged = mergeIngredients(
    [{ slug: "x", qty: { value: 1, kind: "mass" } }],
    [{ slug: "x", qty: { value: 1, kind: "volume" } }],
  );
  assert.equal(merged.length, 2);
});

test("hasTag", () => {
  const tagged: Recipe = { ...baseRecipe, tags: ["soup", "italian"] };
  assert.equal(hasTag(tagged, "soup"), true);
  assert.equal(hasTag(tagged, "stew"), false);
  assert.equal(hasTag(baseRecipe, "soup"), false);
});
