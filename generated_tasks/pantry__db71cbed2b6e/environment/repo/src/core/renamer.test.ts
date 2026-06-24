import { test } from "node:test";
import assert from "node:assert/strict";
import { apply, plan, summarize } from "./renamer.js";
import type { Item } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";

const today = "2026-04-15";

const items: Item[] = [
  { id: 1, slug: "olive-oil", name: "Olive Oil", lots: [], createdAt: today, updatedAt: today },
];

const recipes: Recipe[] = [{
  id: 1, slug: "stir-fry", name: "Stir Fry", servings: 4,
  ingredients: [
    { slug: "olive-oil", qty: { value: 30, kind: "volume" } },
    { slug: "rice-uncooked", qty: { value: 300, kind: "mass" } },
  ],
  createdAt: today, updatedAt: today,
}];

test("plan picks up item slug renames", () => {
  const p = plan("olive-oil", "extra-virgin", items, recipes);
  assert.equal(p.itemRenames.length, 1);
});

test("plan picks up ingredient references", () => {
  const p = plan("olive-oil", "extra-virgin", items, recipes);
  assert.equal(p.recipeIngredientChanges.length, 1);
});

test("plan empty when slug not used", () => {
  const p = plan("missing-slug", "x", items, recipes);
  assert.equal(p.itemRenames.length, 0);
});

test("plan rejects empty from/to", () => {
  assert.throws(() => plan("", "x", items, recipes));
  assert.throws(() => plan("x", "", items, recipes));
});

test("plan no-op when from === to", () => {
  const p = plan("x", "x", items, recipes);
  assert.equal(p.itemRenames.length, 0);
  assert.equal(p.recipeRenames.length, 0);
});

test("apply rewrites item + ingredient slugs", () => {
  const p = plan("olive-oil", "extra-virgin", items, recipes);
  const out = apply(p, items, recipes, "extra-virgin");
  assert.equal(out.items[0]?.slug, "extra-virgin");
  assert.equal(out.recipes[0]?.ingredients[0]?.slug, "extra-virgin");
});

test("apply preserves unrelated ingredients", () => {
  const p = plan("olive-oil", "x", items, recipes);
  const out = apply(p, items, recipes, "x");
  assert.equal(out.recipes[0]?.ingredients[1]?.slug, "rice-uncooked");
});

test("summarize produces a string", () => {
  const p = plan("olive-oil", "x", items, recipes);
  const s = summarize(p);
  assert.match(s, /items: 1/);
});
