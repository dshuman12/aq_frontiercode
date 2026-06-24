import { test } from "node:test";
import assert from "node:assert/strict";
import { format, suggest, topN } from "./meal-suggester.js";
import type { Item } from "../core/item.js";
import type { Recipe } from "../core/recipe.js";

const today = "2026-04-15";

const recipes: Recipe[] = [
  {
    id: 1, slug: "fully-covered", name: "Fully Covered", servings: 4, totalMinutes: 30,
    ingredients: [
      { slug: "tomato", qty: { value: 100, kind: "mass" } },
      { slug: "olive-oil", qty: { value: 30, kind: "volume" } },
    ],
    createdAt: today, updatedAt: today,
  },
  {
    id: 2, slug: "partial", name: "Partial", servings: 4, totalMinutes: 30,
    ingredients: [
      { slug: "tomato", qty: { value: 100, kind: "mass" } },
      { slug: "saffron", qty: { value: 1, kind: "mass" } },
    ],
    createdAt: today, updatedAt: today,
  },
];

const pantry: Item[] = [
  {
    id: 1, slug: "tomato", name: "Tomato",
    lots: [{ id: 1, qty: { value: 1000, kind: "mass" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  },
  {
    id: 2, slug: "olive-oil", name: "Olive Oil",
    lots: [{ id: 1, qty: { value: 500, kind: "volume" }, addedAt: today, where: "pantry" }],
    createdAt: today, updatedAt: today,
  },
];

test("fully covered recipe scores higher than partial", () => {
  const out = suggest(recipes, pantry);
  assert.equal(out[0]?.recipeSlug, "fully-covered");
});

test("classifies coverage", () => {
  const out = suggest(recipes, pantry);
  assert.equal(out[0]?.reason, "fully-covered");
  assert.equal(out[1]?.reason, "partial");
});

test("topN clamps", () => {
  const out = suggest(recipes, pantry);
  assert.equal(topN(out, 1).length, 1);
  assert.equal(topN(out, 99).length, out.length);
});

test("topN negative gives empty", () => {
  const out = suggest(recipes, pantry);
  assert.equal(topN(out, -1).length, 0);
});

test("recipes with no ingredients are skipped", () => {
  const r: Recipe = {
    id: 99, slug: "empty", name: "Empty", servings: 1, ingredients: [],
    createdAt: today, updatedAt: today,
  };
  const out = suggest([r], pantry);
  assert.equal(out.length, 0);
});

test("format produces a string", () => {
  const out = suggest(recipes, pantry);
  const text = format(out[0]!);
  assert.match(text, /fully-covered/);
});

test("longer cook time loses narrow ties", () => {
  const slow: Recipe = {
    id: 3, slug: "slow", name: "Slow", servings: 4, totalMinutes: 120,
    ingredients: [
      { slug: "tomato", qty: { value: 100, kind: "mass" } },
      { slug: "olive-oil", qty: { value: 30, kind: "volume" } },
    ],
    createdAt: today, updatedAt: today,
  };
  const out = suggest([recipes[0]!, slow], pantry);
  assert.equal(out[0]?.recipeSlug, "fully-covered");
});
