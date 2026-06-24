import { test } from "node:test";
import assert from "node:assert/strict";
import { average, highest, inMonth, lowest, perDay } from "./nutrition-day.js";
import type { Recipe } from "../core/recipe.js";

const today = "2026-04-15";

const recipes: Recipe[] = [
  {
    id: 1, slug: "rice-bowl", name: "Rice Bowl", servings: 4,
    ingredients: [
      { slug: "rice-uncooked", qty: { value: 200, kind: "mass" } },
      { slug: "egg", qty: { value: 200, kind: "mass" } },
    ],
    createdAt: today, updatedAt: today,
  },
];

test("perDay aggregates totals across multiple meals same day", () => {
  const out = perDay(
    [
      { date: "2026-04-15", meal: "lunch", recipeSlug: "rice-bowl", servings: 2 },
      { date: "2026-04-15", meal: "dinner", recipeSlug: "rice-bowl", servings: 4 },
    ],
    recipes,
  );
  assert.equal(out.length, 1);
  assert.equal(out[0]?.meals, 2);
});

test("perDay scales by servings", () => {
  const single = perDay(
    [{ date: "2026-04-15", meal: "lunch", recipeSlug: "rice-bowl", servings: 2 }],
    recipes,
  );
  const double = perDay(
    [{ date: "2026-04-15", meal: "lunch", recipeSlug: "rice-bowl", servings: 4 }],
    recipes,
  );
  assert.ok(double[0]!.totals.cal > single[0]!.totals.cal);
});

test("perDay sorted by date asc", () => {
  const out = perDay(
    [
      { date: "2026-04-16", meal: "lunch", recipeSlug: "rice-bowl", servings: 2 },
      { date: "2026-04-15", meal: "lunch", recipeSlug: "rice-bowl", servings: 2 },
    ],
    recipes,
  );
  assert.equal(out[0]?.date, "2026-04-15");
});

test("perDay skips meals with unknown recipe", () => {
  const out = perDay(
    [{ date: "2026-04-15", meal: "lunch", recipeSlug: "missing", servings: 2 }],
    recipes,
  );
  assert.deepEqual(out, []);
});

test("average over empty is empty macros", () => {
  const m = average([]);
  assert.deepEqual(m, { cal: 0, protein: 0, carbs: 0, fat: 0 });
});

test("highest + lowest pick by cal", () => {
  const out = perDay(
    [
      { date: "2026-04-15", meal: "lunch", recipeSlug: "rice-bowl", servings: 2 },
      { date: "2026-04-16", meal: "lunch", recipeSlug: "rice-bowl", servings: 8 },
    ],
    recipes,
  );
  assert.equal(highest(out)?.date, "2026-04-16");
  assert.equal(lowest(out)?.date, "2026-04-15");
});

test("inMonth filters", () => {
  const out = perDay(
    [
      { date: "2026-04-15", meal: "lunch", recipeSlug: "rice-bowl", servings: 2 },
      { date: "2026-05-15", meal: "lunch", recipeSlug: "rice-bowl", servings: 2 },
    ],
    recipes,
  );
  assert.equal(inMonth(out, "2026-04").length, 1);
});
