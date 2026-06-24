import { test } from "node:test";
import assert from "node:assert/strict";
import { batchScale, describe, sanityCheck, split } from "./splits.js";
import type { Recipe } from "./recipe.js";

const today = "2026-04-15";

const recipe: Recipe = {
  id: 1, slug: "minestrone", name: "Minestrone", servings: 4,
  ingredients: [],
  createdAt: today, updatedAt: today,
};

test("split distributes servings evenly", () => {
  const out = split(recipe, { totalServings: 8, acrossMeals: 4 });
  assert.equal(out.length, 4);
  assert.equal(out[0]?.servings, 2);
});

test("split rejects bad inputs", () => {
  assert.throws(() => split(recipe, { totalServings: 0, acrossMeals: 4 }));
  assert.throws(() => split(recipe, { totalServings: 8, acrossMeals: 0 }));
});

test("batchScale ratio", () => {
  assert.equal(batchScale(recipe, 8), 2);
  assert.equal(batchScale(recipe, 2), 0.5);
});

test("describe includes scale + meals", () => {
  const out = describe(recipe, { totalServings: 8, acrossMeals: 4 });
  assert.match(out, /scale: 2.00x/);
  assert.match(out, /splits: 4/);
  assert.match(out, /meal 1: 2/);
});

test("sanityCheck warns on tiny batches", () => {
  const w = sanityCheck(recipe, { totalServings: 1, acrossMeals: 1 });
  assert.ok(w.some((s) => s.includes("below 0.5x")));
});

test("sanityCheck warns on huge batches", () => {
  const w = sanityCheck(recipe, { totalServings: 50, acrossMeals: 1 });
  assert.ok(w.some((s) => s.includes("above 4x")));
});

test("sanityCheck warns on too many meals", () => {
  const w = sanityCheck(recipe, { totalServings: 32, acrossMeals: 8 });
  assert.ok(w.some((s) => s.includes("more than a week")));
});

test("sanityCheck silent on reasonable batch", () => {
  assert.deepEqual(sanityCheck(recipe, { totalServings: 8, acrossMeals: 4 }), []);
});

test("fractionOfBatch sums to ~1", () => {
  const out = split(recipe, { totalServings: 8, acrossMeals: 4 });
  const sum = out.reduce((acc, s) => acc + s.fractionOfBatch, 0);
  assert.ok(Math.abs(sum - 1) < 0.0001);
});
